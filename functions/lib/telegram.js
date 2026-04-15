"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.processTelegramEvent = exports.processTelegramSession = exports.telegramWebhook = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-functions/v2/firestore");
const params_1 = require("firebase-functions/params");
const telegraf_1 = require("telegraf");
const md_to_pdf_1 = require("md-to-pdf");
const index_1 = require("./index");
const telegramBotToken = (0, params_1.defineString)('TELEGRAM_BOT_TOKEN');
const geminiApiKey = (0, params_1.defineString)('GEMINI_API_KEY');
const AGENTS = [
    "ADN Bíblico",
    "Raíces",
    "El Historiador",
    "El Arqueólogo",
    "El Teólogo",
    "El Mentor",
    "Traducciones"
];
const getDb = () => admin.firestore();
const getBot = () => new telegraf_1.Telegraf(telegramBotToken.value());
function getButtonsForAgent(agent) {
    return telegraf_1.Markup.inlineKeyboard([
        telegraf_1.Markup.button.callback('✅ Aprobar', `approve:${encodeURIComponent(agent)}`),
        telegraf_1.Markup.button.callback('🔄 Rehacer', `redo:${encodeURIComponent(agent)}`),
        telegraf_1.Markup.button.callback('✏️ Editar (Próximamente)', `edit:${encodeURIComponent(agent)}`)
    ]);
}
async function sendAgentPDF(chatId, agent, markdown, bot) {
    try {
        const textToConvert = `# Reporte de: ${agent}\n\n${markdown}`;
        // Generate PDF
        const pdf = await (0, md_to_pdf_1.mdToPdf)({ content: textToConvert }, {
            css: "body { font-family: sans-serif; padding: 20px; }",
            launch_options: {
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
            }
        });
        if (pdf && pdf.content) {
            await bot.telegram.sendDocument(chatId, { source: Buffer.from(pdf.content), filename: `${agent}.pdf` }, {
                caption: `📄 Reporte completado: ${agent}\nEnviado para revisión.`,
                ...getButtonsForAgent(agent)
            });
        }
        else {
            throw new Error("Empty PDF");
        }
    }
    catch (e) {
        console.error(`Error generating PDF for ${agent}`, e);
        // Fallback: send as .md file
        const mdBuffer = Buffer.from(`# Reporte de: ${agent}\n\n${markdown}`, 'utf-8');
        await bot.telegram.sendDocument(chatId, { source: mdBuffer, filename: `${agent}.md` }, {
            caption: `📄 Reporte completado: ${agent} (No se pudo generar PDF, enviando MD)\nEnviado para revisión.`,
            ...getButtonsForAgent(agent)
        });
    }
}
async function checkAndGenerateResumen(chatId, bot, sessionData, apiKey) {
    const results = sessionData.results || {};
    let allApproved = true;
    let combinedReports = "";
    for (const agent of AGENTS) {
        if (!results[agent] || results[agent].status !== 'approved') {
            allApproved = false;
            break;
        }
        combinedReports += `\n\n--- INFORME DE ${agent} ---\n${results[agent].text}`;
    }
    if (allApproved && sessionData.status !== 'generating_resumen' && sessionData.status !== 'completed') {
        const db = getDb();
        await db.collection('telegram_sessions').doc(chatId).update({ status: 'generating_resumen' });
        await bot.telegram.sendMessage(chatId, "✅ Todos los informes aprobados. Generando el Resumen Absoluto...");
        try {
            const result = await (0, index_1.runAnalyzeVerse)({
                verse: sessionData.verse,
                agentType: "Resumen",
                reports: combinedReports,
                language: 'es',
                responseLength: 'large'
            }, apiKey);
            if (result && result.result) {
                // Send PDF of final summary
                await sendAgentPDF(chatId, "Resumen Absoluto", result.result, bot);
                await db.collection('telegram_sessions').doc(chatId).update({
                    status: 'completed',
                    resumen: result.result
                });
                await bot.telegram.sendMessage(chatId, "🎉 ¡Proceso finalizado con éxito!");
            }
        }
        catch (err) {
            console.error("Error generating resumen:", err);
            await bot.telegram.sendMessage(chatId, "❌ Hubo un error al generar el Resumen Absoluto.");
        }
    }
}
exports.telegramWebhook = (0, https_1.onRequest)({ cors: true, timeoutSeconds: 30, memory: "256MiB", invoker: "public" }, async (request, response) => {
    const token = telegramBotToken.value();
    if (!token) {
        response.status(500).send("No Telegram bot token");
        return;
    }
    const bot = getBot();
    bot.on('text', async (ctx) => {
        const text = ctx.message.text.trim();
        if (text.startsWith('/')) {
            if (text === '/start') {
                await ctx.reply("¡Bienvenido a Rema IA! Envía un versículo para comenzar el análisis profundo.");
            }
            return;
        }
        const chatId = ctx.chat.id.toString();
        const verse = text;
        await ctx.reply(`Iniciando análisis profundo de: ${verse}. Esto tomará unos minutos...`);
        const sessionRef = getDb().collection('telegram_sessions').doc();
        await sessionRef.set({
            chatId,
            verse,
            status: 'analyzing',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            results: {}
        });
    });
    bot.on('callback_query', async (ctx) => {
        const callbackData = ctx.callbackQuery.data;
        if (callbackData) {
            const db = getDb();
            const chatId = ctx.chat?.id?.toString();
            const [action, agentStr] = callbackData.split(':');
            const agent = agentStr ? decodeURIComponent(agentStr) : '';
            if (action === 'approve') {
                await ctx.answerCbQuery('Aprobando...');
                await db.collection('telegram_events').add({
                    chatId,
                    agent,
                    type: 'approve',
                    timestamp: admin.firestore.FieldValue.serverTimestamp()
                });
            }
            else if (action === 'redo') {
                await ctx.answerCbQuery('Rehaciendo...');
                await db.collection('telegram_events').add({
                    chatId,
                    agent,
                    type: 'redo',
                    timestamp: admin.firestore.FieldValue.serverTimestamp()
                });
            }
            else if (action === 'edit') {
                await ctx.answerCbQuery('Funcionalidad de edición coming soon.', { show_alert: true });
            }
        }
    });
    try {
        await bot.handleUpdate(request.body);
        if (!response.headersSent) {
            response.status(200).send("OK");
        }
    }
    catch (err) {
        console.error("Webhook error:", err);
        if (!response.headersSent) {
            response.status(500).send("Error");
        }
    }
});
// Triggered when a new session is created. It automatically runs the 7 agents sequentially (or staggered)
exports.processTelegramSession = (0, firestore_1.onDocumentCreated)({ document: 'telegram_sessions/{chatId}', timeoutSeconds: 540, memory: "1GiB" }, async (event) => {
    const snapshot = event.data;
    if (!snapshot)
        return;
    const data = snapshot.data();
    if (data.status !== 'analyzing')
        return;
    const chatId = data.chatId; // Use chatId from data instead of doc id
    const apiKey = geminiApiKey.value();
    const bot = getBot();
    const db = getDb();
    // We will run them sequentially to avoid rate limits and memory issues with mdToPdf concurrently
    for (const agent of AGENTS) {
        try {
            await bot.telegram.sendMessage(chatId, `⏳ Analizando con Agente: ${agent}...`);
            const result = await (0, index_1.runAnalyzeVerse)({
                verse: data.verse,
                agentType: agent,
                language: 'es',
                responseLength: 'standard'
            }, apiKey);
            // Re-fetch the session ref since we're using auto-ID now!
            const sessionSnap = await db.collection('telegram_sessions')
                .where('chatId', '==', chatId)
                .orderBy('createdAt', 'desc')
                .limit(1)
                .get();
            const sessionRef = sessionSnap.docs[0].ref;
            if (result && result.result) {
                // Save to DB
                await db.collection('telegram_sessions').doc(sessionRef.id).update({
                    [`results.${agent}`]: {
                        text: result.result,
                        status: 'pending_approval' // expecting 'approved' later
                    }
                });
                // Convert to PDF and Send
                await sendAgentPDF(chatId, agent, result.result, bot);
            }
        }
        catch (e) {
            console.error(`Error with agent ${agent}:`, e);
            await bot.telegram.sendMessage(chatId, `❌ Error con Agente ${agent}: ${e.message || 'Desconocido'}`);
        }
        finally {
            // Stagger to prevent fast 429 even if it failed
            await new Promise(r => setTimeout(r, 10000));
        }
    }
});
// Triggered when a button (approve/redo) is clicked via telegram
exports.processTelegramEvent = (0, firestore_1.onDocumentCreated)({ document: 'telegram_events/{eventId}', timeoutSeconds: 540, memory: "1GiB" }, async (event) => {
    const snapshot = event.data;
    if (!snapshot)
        return;
    const data = snapshot.data();
    const db = getDb();
    const bot = getBot();
    const apiKey = geminiApiKey.value();
    const { chatId, agent, type } = data;
    const sessionSnap = await db.collection('telegram_sessions')
        .where('chatId', '==', chatId)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();
    if (sessionSnap.empty)
        return;
    const sessionRef = sessionSnap.docs[0].ref;
    const sessionData = sessionSnap.docs[0].data();
    if (type === 'approve') {
        await sessionRef.update({
            [`results.${agent}.status`]: 'approved'
        });
        await bot.telegram.sendMessage(chatId, `✅ Has aprobado el reporte de **${agent}**!`, { parse_mode: "Markdown" });
        // After approval, check if we must generate the resume
        const updatedSnap = await sessionRef.get();
        await checkAndGenerateResumen(chatId, bot, updatedSnap.data(), apiKey);
    }
    else if (type === 'redo') {
        const verse = sessionData.verse;
        await bot.telegram.sendMessage(chatId, `🔄 Rehaciendo análisis de **${agent}** para "${verse}"...`, { parse_mode: "Markdown" });
        await sessionRef.update({
            [`results.${agent}.status`]: 'processing'
        });
        try {
            const result = await (0, index_1.runAnalyzeVerse)({
                verse: verse,
                agentType: agent,
                language: 'es',
                responseLength: 'standard',
                isRemake: true
            }, apiKey);
            if (result && result.result) {
                await sessionRef.update({
                    [`results.${agent}`]: {
                        text: result.result,
                        status: 'pending_approval'
                    }
                });
                await sendAgentPDF(chatId, agent, result.result, bot);
            }
        }
        catch (e) {
            await bot.telegram.sendMessage(chatId, `❌ Error al rehacer ${agent}.`);
        }
    }
});
//# sourceMappingURL=telegram.js.map