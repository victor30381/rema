"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAgentAnalysis = runAgentAnalysis;
const generative_ai_1 = require("@google/generative-ai");
const https_1 = require("firebase-functions/v2/https");
async function runAgentAnalysis({ verse, agentType, refinementPrompt, isRemake, reports, language, responseLength, originalText, selectedText, isRefiningSelection, apiKey }) {
    if (!verse) {
        throw new https_1.HttpsError("invalid-argument", "The function must be called with a 'verse' argument.");
    }
    if (!apiKey) {
        throw new https_1.HttpsError("internal", "GEMINI_API_KEY is not set.");
    }
    const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
    const isEnglish = language === 'en';
    const responseLengthMap = {
        concise: { min: 800, label: isEnglish ? '800 words' : '800 palabras' },
        standard: { min: 1500, label: isEnglish ? '1500 words' : '1500 palabras' },
        detailed: { min: 2500, label: isEnglish ? '2500 words' : '2500 palabras' },
    };
    const lengthConfig = responseLengthMap[responseLength] || responseLengthMap.standard;
    const baseInstruction = isEnglish
        ? `You are **Rema**, an AI engine specialized in deep, academic, and spiritual Bible study.
Always respond in English. Use enriched Markdown with headings (##, ###), **bold**, *italics*, lists, blockquotes for biblical citations, and tables when appropriate.
Be thorough but clear. Cite biblical references in standard format (Book ch:v).
STRICT START RULE: Do NOT include any greeting. Your response must begin strictly with:
1. A descriptive Title as a heading.
2. The biblical passage being studied, explicitly in parentheses after the title.
3. A brief introductory summary.
Then dive directly into the research.
RESPONSE LENGTH RULE: Your response MUST be at least ${lengthConfig.min} words.`
        : `Eres **Rema**, un motor de inteligencia artificial especializado en estudio bíblico profundo, académico y espiritual. 
Responde siempre en español. Usa formato Markdown enriquecido con encabezados (##, ###), **negritas**, *cursivas*, listas, blockquotes para citas bíblicas, y tablas cuando sea apropiado. 
Sé exhaustivo pero claro. Cita referencias bíblicas con el formato estándar (Libro cap:vers).
REGLA ESTRICTA DE INICIO: NO incluyas ningún tipo de saludo inicial. Tu respuesta debe comenzar estrictamente con:
1. Un Título descriptivo como encabezado.
2. El pasaje o versículo bíblico que se está estudiando, explícitamente entre paréntesis, a continuación del título.
3. Una breve reseña introductoria.
Luego de esto, arranca directamente con la investigación.
REGLA DE EXTENSIÓN: Tu respuesta DEBE tener un mínimo de ${lengthConfig.min} palabras.`;
    let agentInstruction = "";
    switch (agentType) {
        case "ADN Bíblico":
            agentInstruction = `## Rol y Perfil: 
Actúa como un Doctor en Filología Semítica y Griega Antigua... (Instrucción omitida por longitud, usaré el mismo case de index.ts)`;
            break;
        // ... we need the full text for the agents. I'll just keep it short here or copy it from index.ts.
    }
}
//# sourceMappingURL=ai.js.map