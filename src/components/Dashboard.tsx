import { useState, useEffect, useCallback } from 'react';
import { Search, Dna, Sprout, ScrollText, Search as MagnifyingGlass, BookOpen, Users, Layers, Sparkles, ArrowRight, Loader, Copy, Check, RotateCcw, ChevronDown, Edit2, RefreshCw, CheckCircle, Send, FileText, LogIn, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AgentCard } from './AgentCard';
import { httpsCallable } from "firebase/functions";
import { signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider } from "firebase/auth";
import { functions, auth, googleProvider } from '../firebase';
import { marked } from "marked";
import { useSettings } from '../contexts/SettingsContext';
import type { HistoryEntry } from '../App';
import './Dashboard.css';

interface Agent {
  title: string;
  subtitle?: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

interface AgentResult {
  loading: boolean;
  result: string | null;
  progress: number;
  error: string | null;
  wordCount?: number;
  approved?: boolean;
  isEditing?: boolean;
  editPrompt?: string;
  selectedText?: string;
}

interface DashboardProps {
  onSaveToHistory: (entry: HistoryEntry) => void;
  loadedEntry: HistoryEntry | null;
  onClearLoaded: () => void;
  onGoHome: () => void;
}

const countWords = (text: string) => text.trim().split(/\s+/).filter(w => w.length > 0).length;

export function Dashboard({ onSaveToHistory, loadedEntry, onClearLoaded, onGoHome }: DashboardProps) {
  const { settings } = useSettings();
  const [verse, setVerse] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [globalResults, setGlobalResults] = useState<Record<string, AgentResult>>({});
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [verseText, setVerseText] = useState<string | null>(null);
  const [loadingVerseText, setLoadingVerseText] = useState(false);
  const [exportingStates, setExportingStates] = useState<Record<string, boolean>>({});
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const [lastExportedUrl, setLastExportedUrl] = useState<string | null>(null);
  const [showExportBanner, setShowExportBanner] = useState(false);

  const agents: Agent[] = [
    { 
      title: "ADN Bíblico", 
      subtitle: "(Original)", 
      description: "Etimología y análisis en hebreo, griego y arameo",
      icon: <Dna />, 
      color: "var(--neon-orange)" 
    },
    { 
      title: "Raíces", 
      subtitle: "(la fuente)", 
      description: "Trasfondo cultural del Cercano Oriente Antiguo",
      icon: <Sprout />, 
      color: "var(--neon-green)" 
    },
    { 
      title: "El Historiador", 
      subtitle: "(contexto)", 
      description: "Contexto histórico, político y temporal",
      icon: <ScrollText />, 
      color: "var(--neon-yellow)" 
    },
    { 
      title: "El Arqueólogo", 
      description: "Descubrimientos arqueológicos y evidencia material",
      icon: <MagnifyingGlass />, 
      color: "var(--neon-purple)" 
    },
    { 
      title: "El Teólogo", 
      description: "Análisis doctrinal y teología sistemática",
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 2v10m0 10v-6m-4-6h8"/></svg>, 
      color: "var(--neon-cyan)" 
    },
    { 
      title: "El Mentor", 
      subtitle: "Pastoral", 
      description: "Aplicación práctica y reflexión espiritual",
      icon: <Users />, 
      color: "var(--neon-pink)" 
    },
    { 
      title: "Traducciones", 
      subtitle: "en paralelo", 
      description: "Comparación entre múltiples versiones bíblicas",
      icon: <BookOpen />, 
      color: "var(--neon-blue)" 
    },
    { 
      title: "Resumen", 
      subtitle: "Absoluto", 
      description: "Exégesis integral equilibrada del pasaje",
      icon: <Layers />, 
      color: "var(--neon-red)" 
    }
  ];


  // Check for stored Google token on mount (e.g., after a redirect)
  useEffect(() => {
    const storedToken = sessionStorage.getItem('rema_google_token');
    if (storedToken) {
      setGoogleToken(storedToken);
      setGoogleConnected(true);
    }

    // Handle redirect result from signInWithRedirect
    getRedirectResult(auth).then((result) => {
      if (result) {
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const token = credential?.accessToken || null;
        if (token) {
          setGoogleToken(token);
          setGoogleConnected(true);
          sessionStorage.setItem('rema_google_token', token);
        }
      }
    }).catch((err) => {
      console.warn('Redirect result error:', err);
    });
  }, []);

  const connectGoogleAccount = useCallback(async () => {
    setConnectingGoogle(true);
    try {
      // Try popup first (works on desktop and some mobile browsers)
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken || null;
      if (token) {
        setGoogleToken(token);
        setGoogleConnected(true);
        sessionStorage.setItem('rema_google_token', token);
      }
    } catch (popupError: any) {
      // If popup is blocked or fails, try redirect
      if (popupError.code === 'auth/popup-blocked' || 
          popupError.code === 'auth/popup-closed-by-user' ||
          popupError.code === 'auth/cancelled-popup-request' ||
          popupError.code === 'auth/internal-error') {
        try {
          await signInWithRedirect(auth, googleProvider);
          // Page will redirect, no further code runs
        } catch (redirectError) {
          console.error('Redirect auth error:', redirectError);
          alert('No se pudo conectar con Google. Intenta de nuevo.');
        }
      } else {
        console.error('Auth error:', popupError);
        alert('Error al conectar con Google: ' + popupError.message);
      }
    } finally {
      setConnectingGoogle(false);
    }
  }, []);

  // Load a history entry when one is selected from the sidebar
  useEffect(() => {
    if (loadedEntry) {
      setVerse(loadedEntry.verse);
      setVerseText(loadedEntry.verseText);
      setLoadingVerseText(false);
      setExpandedAgent(null);
      setError(null);
      
      // Reconstruct globalResults from the saved history entry
      const restoredResults: Record<string, AgentResult> = {};
      Object.entries(loadedEntry.results).forEach(([title, data]) => {
        restoredResults[title] = {
          loading: false,
          result: data.result,
          progress: 100,
          error: null,
          wordCount: data.wordCount,
          approved: data.approved || false,
          isEditing: false,
          editPrompt: ''
        };
      });
      setGlobalResults(restoredResults);
      onClearLoaded();
    }
  }, [loadedEntry, onClearLoaded]);

  // Auto-save to history when all agents finish (no more loading)
  useEffect(() => {
    if (!verse || isSearching) return;
    if (!settings.autoSaveHistory) return; // Respect settings
    
    const entries = Object.entries(globalResults);
    if (entries.length === 0) return;
    
    const anyLoading = entries.some(([, r]) => r.loading);
    const anySuccess = entries.some(([, r]) => r.result !== null);
    
    if (!anyLoading && anySuccess) {
      const resultsToSave: Record<string, { result: string | null; wordCount?: number; approved?: boolean }> = {};
      entries.forEach(([title, r]) => {
        if (r.result) {
          resultsToSave[title] = {
            result: r.result,
            wordCount: r.wordCount,
            approved: r.approved
          };
        }
      });

      onSaveToHistory({
        id: `${verse}-${Date.now()}`,
        verse,
        verseText,
        date: new Date().toISOString(),
        results: resultsToSave
      });
    }
  }, [isSearching]); // Only trigger when search completes

  const handleGlobalSearch = async () => {
    if (!verse.trim()) {
      setError("Por favor, ingresa un versículo o palabra clave primero.");
      return;
    }
    
    setError(null);
    setIsSearching(true);
    setExpandedAgent(null);
    setVerseText(null);
    setLoadingVerseText(true);
    
    const targetAgents = agents.filter(a => a.title !== "Resumen");
    
    const initialMap: Record<string, AgentResult> = {};
    targetAgents.forEach(a => {
      initialMap[a.title] = { loading: true, result: null, progress: 0, error: null, approved: false, isEditing: false, editPrompt: '' };
    });
    setGlobalResults(initialMap);

    const analyzeVerse = httpsCallable(functions, 'analyzeVerse', { timeout: 540000 });

    // Fetch actual verse text sequentially before agents to avoid rate limiting
    try {
      const textRes: any = await analyzeVerse({ verse, agentType: 'ObtenerTexto' });
      setVerseText(textRes.data.result);
    } catch {
      setVerseText(null);
    } finally {
      setLoadingVerseText(false);
    }

    // Wait 4.5 seconds after ObtenerTexto before launching Agent 1 to respect Free Tier Limits
    await new Promise(resolve => setTimeout(resolve, 4500));



    let currentIndex = 0;
    const processQueue = async () => {
      while (currentIndex < targetAgents.length) {
        const agent = targetAgents[currentIndex];
        
        setGlobalResults(prev => ({
          ...prev,
          [agent.title]: { ...prev[agent.title], loading: true, progress: 0 }
        }));

        const timerId = setInterval(() => {
          setGlobalResults(prev => {
            const current = prev[agent.title];
            if (!current || !current.loading) return prev;
            
            const increment = Math.random() * 2.5; 
            const newProgress = Math.min(current.progress + increment, 95);
            
            return {
              ...prev,
              [agent.title]: { ...current, progress: newProgress }
            };
          });
        }, 1500); 

        try {
          const res: any = await analyzeVerse({ verse, agentType: agent.title, language: settings.language, responseLength: settings.responseLength });
          clearInterval(timerId);
          setGlobalResults(prev => ({
            ...prev,
            [agent.title]: { 
              ...prev[agent.title],
              loading: false, 
              result: res.data.result, 
              progress: 100, 
              error: null,
              wordCount: countWords(res.data.result || '')
            }
          }));
        } catch (err: any) {
          clearInterval(timerId);
          setGlobalResults(prev => ({
            ...prev,
            [agent.title]: { ...prev[agent.title], loading: false, result: null, progress: 0, error: err.message || "Error al consultar al agente" }
          }));
        }
        
        currentIndex++;
        // Wait 4.5 seconds before starting the next agent to respect 15 RPM free tier limits
        if (currentIndex < targetAgents.length) {
          await new Promise(resolve => setTimeout(resolve, 4500));
        }
      }
    };

    await processQueue(); 
    setIsSearching(false);
  };

  const invokeAgent = async (agentTitle: string, isRemake: boolean = false, refinementPrompt?: string, isRefiningSelection: boolean = false, selectedText?: string, originalText?: string) => {
    const analyzeVerse = httpsCallable(functions, 'analyzeVerse', { timeout: 540000 });
    
    setGlobalResults(prev => ({
      ...prev,
      [agentTitle]: { ...prev[agentTitle], loading: true, progress: 0, error: null, approved: false }
    }));

    const timerId = setInterval(() => {
      setGlobalResults(prev => {
        const current = prev[agentTitle];
        if (!current || !current.loading) return prev;
        const increment = Math.random() * 5; 
        const newProgress = Math.min(current.progress + increment, 95);
        return { ...prev, [agentTitle]: { ...current, progress: newProgress } };
      });
    }, 1000);

    try {
      const res: any = await analyzeVerse({ 
        verse, 
        agentType: agentTitle, 
        isRemake, 
        refinementPrompt, 
        isRefiningSelection, 
        selectedText, 
        originalText,
        language: settings.language, 
        responseLength: settings.responseLength 
      });
      clearInterval(timerId);
      setGlobalResults(prev => ({
        ...prev,
        [agentTitle]: { 
          ...prev[agentTitle],
          loading: false, 
          result: res.data.result, 
          progress: 100, 
          error: null,
          wordCount: countWords(res.data.result || ''),
          isEditing: false,
          editPrompt: '',
          selectedText: undefined
        }
      }));
    } catch (err: any) {
      clearInterval(timerId);
      setGlobalResults(prev => ({
        ...prev,
        [agentTitle]: { ...prev[agentTitle], loading: false, result: null, progress: 0, error: err.message || "Error al consultar al agente" }
      }));
    }
  };

  const handleGenerateSummary = async () => {
    const approvedReports = Object.entries(globalResults)
      .filter(([title, res]) => title !== "Resumen" && res.approved && res.result)
      .map(([title, res]) => `### INFORME: ${title}\n${res.result}`)
      .join("\n\n");

    if (!approvedReports) {
      setError("Necesitas aprobar al menos un informe para generar el Resumen Absoluto.");
      return;
    }

    setGeneratingSummary(true);
    setExpandedAgent("Resumen");
    
    setGlobalResults(prev => ({
      ...prev,
      "Resumen": { loading: true, result: null, progress: 0, error: null }
    }));

    const timerId = setInterval(() => {
      setGlobalResults(prev => {
        const current = prev["Resumen"];
        if (!current || !current.loading) return prev;
        const newProgress = Math.min(current.progress + (Math.random() * 2), 95);
        return { ...prev, "Resumen": { ...current, progress: newProgress } };
      });
    }, 1500);

    try {
      const analyzeVerse = httpsCallable(functions, 'analyzeVerse', { timeout: 540000 });
      const res: any = await analyzeVerse({ verse, agentType: "Resumen", reports: approvedReports, language: settings.language, responseLength: settings.responseLength });
      clearInterval(timerId);
      setGlobalResults(prev => ({
        ...prev,
        "Resumen": { 
          ...prev["Resumen"],
          loading: false, result: res.data.result, progress: 100, error: null, 
          wordCount: countWords(res.data.result || ''),
          approved: false, isEditing: false 
        }
      }));
    } catch (err: any) {
      clearInterval(timerId);
      setGlobalResults(prev => ({
        ...prev,
        "Resumen": { ...prev["Resumen"], loading: false, result: null, progress: 0, error: err.message }
      }));
    } finally {
      setGeneratingSummary(false);
    }
  };

  const setAgentEditing = (agentTitle: string, isEditing: boolean) => {
    setGlobalResults(prev => ({ ...prev, [agentTitle]: { ...prev[agentTitle], isEditing } }));
  };

  const updateEditPrompt = (agentTitle: string, prompt: string) => {
    setGlobalResults(prev => ({ ...prev, [agentTitle]: { ...prev[agentTitle], editPrompt: prompt } }));
  };

  const handleTextSelection = (agentTitle: string) => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      setGlobalResults(prev => ({ 
        ...prev, 
        [agentTitle]: { ...prev[agentTitle], selectedText: selection.toString().trim() } 
      }));
    }
  };

  const getOrCreateFolder = async (token: string, folderName: string, parentId?: string) => {
    let query = `mimeType='application/vnd.google-apps.folder' and name='${folderName.replace(/'/g, "\\'")}' and trashed = false`;
    if (parentId) query += ` and '${parentId}' in parents`;
    
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id)`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (searchRes.status === 401) throw new Error("TokenExpired");
    
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) return searchData.files[0].id;
    }
    
    const createMetadata: any = { name: folderName, mimeType: "application/vnd.google-apps.folder" };
    if (parentId) createMetadata.parents = [parentId];
    
    const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(createMetadata)
    });

    if (createRes.status === 401) throw new Error("TokenExpired");
    
    if (createRes.ok) {
      const createData = await createRes.json();
      return createData.id;
    }
    return null;
  };

  const exportAgentToDocs = async (agentTitle: string, resultText: string) => {
    try {
      setExportingStates(prev => ({ ...prev, [agentTitle]: true }));
      
      let currentToken = googleToken;

      // If no token, try to authenticate first
      if (!currentToken) {
        try {
          const result = await signInWithPopup(auth, googleProvider);
          const credential = GoogleAuthProvider.credentialFromResult(result);
          currentToken = credential?.accessToken || null;
          if (currentToken) {
            setGoogleToken(currentToken);
            setGoogleConnected(true);
            sessionStorage.setItem('rema_google_token', currentToken);
          }
        } catch (popupErr: any) {
          // If popup fails (GitHub Pages, mobile, etc.), prompt user to connect first
          if (popupErr.code === 'auth/popup-blocked' || 
              popupErr.code === 'auth/popup-closed-by-user' ||
              popupErr.code === 'auth/internal-error') {
            alert('⚠️ Tu navegador bloqueó la ventana de autenticación.\n\nPor favor, primero haz clic en "Conectar Google" en la barra superior y luego intenta exportar de nuevo.');
            setExportingStates(prev => ({ ...prev, [agentTitle]: false }));
            return;
          }
          throw popupErr;
        }
      }

      if (!currentToken) {
        throw new Error("No se pudo obtener el token de Google. Conecta tu cuenta primero.");
      }

      // Organizar en carpetas en Google Drive
      const rootFolderId = await getOrCreateFolder(currentToken, "Estudios Rema");
      let verseFolderId = null;
      if (rootFolderId) {
        verseFolderId = await getOrCreateFolder(currentToken, `Análisis: ${verse}`, rootFolderId);
      }

      const contentToExport = `# ${agentTitle}\n\n**Texto de referencia: ${verse}**\n\n${resultText}`;
      const rawHtml = await marked.parse(contentToExport);
      const htmlContent = `<html>
        <head>
          <style>
            body { font-size: 14pt; font-family: 'Arial', sans-serif; }
            p, li, td, span, div { font-size: 14pt; }
            h1 { font-size: 24pt; color: #1a0dab; }
            h2 { font-size: 18pt; color: #1a0dab; }
            h3 { font-size: 16pt; color: #1a0dab; }
          </style>
        </head>
        <body>
          ${rawHtml}
        </body>
      </html>`;
      
      const metadata: any = {
        name: `Rema: ${agentTitle} - ${verse}`,
        mimeType: "application/vnd.google-apps.document"
      };
      
      if (verseFolderId) {
        metadata.parents = [verseFolderId];
      }

      const boundary = "-------314159265358979323846";
      const delimiter = "\r\n--" + boundary + "\r\n";
      const close_delim = "\r\n--" + boundary + "--";

      const multipartRequestBody =
        delimiter +
        "Content-Type: application/json\r\n\r\n" +
        JSON.stringify(metadata) +
        delimiter +
        "Content-Type: text/html\r\n\r\n" +
        htmlContent +
        close_delim;

      const response = await fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${currentToken}`,
            "Content-Type": `multipart/related; boundary=${boundary}`,
          },
          body: multipartRequestBody,
        }
      );

      if (response.status === 401) {
        throw new Error("TokenExpired");
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error("Error from Drive API:", errorData);
        throw new Error(errorData?.error?.message || "Error al exportar a Google Docs");
      }

      const file = await response.json();
      const docsUrl = `https://docs.google.com/document/d/${file.id}/edit`;
      
      // Show the exported URL in a banner instead of relying on popups
      setLastExportedUrl(docsUrl);
      setShowExportBanner(true);
      
      // Also try to open it (may be blocked on some browsers, but the banner is the fallback)
      try {
        const opened = window.open(docsUrl, '_blank');
        if (!opened) {
          // window.open was blocked - the banner already shows the link
          console.log('Popup blocked, using banner link');
        }
      } catch {
        // Silently fail - user can use the banner link
      }
      
    } catch (error: any) {
      if (error.message === "TokenExpired") {
        setGoogleToken(null);
        setGoogleConnected(false);
        sessionStorage.removeItem('rema_google_token');
        alert("Tu sesión de Google expiró. Por favor, conecta de nuevo haciendo clic en 'Conectar Google'.");
      } else {
        console.error("Error exporting to docs", error);
        alert("Error al exportar a Google Docs: " + error.message);
      }
    } finally {
      setExportingStates(prev => ({ ...prev, [agentTitle]: false }));
    }
  };

  const toggleApproveAgent = async (agentTitle: string, _resultText: string) => {
    const isCurrentlyApproved = globalResults[agentTitle]?.approved;
    setGlobalResults(prev => ({ ...prev, [agentTitle]: { ...prev[agentTitle], approved: !isCurrentlyApproved, isEditing: false } }));
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const scrollToAgents = () => {
    document.querySelector('.dashboard-content')?.scrollIntoView({ behavior: 'smooth' });
  };

  const hasResults = Object.keys(globalResults).length > 0;
  const numApproved = Object.values(globalResults).filter(r => r.approved).length;

  return (
    <div className="dashboard">
      <div className="hero-section">
        <div className="hero-badge">
          <Sparkles size={16} className="hero-badge-icon" />
          <span>Rema v1.0 — AI Engine</span>
        </div>
        <h1 className="hero-title">
          Descubre la <span className="text-gradient">Verdad Profunda</span><br />
          de las Escrituras
        </h1>
        <p className="hero-subtitle">
          Agentes de inteligencia artificial especializados analizan cada versículo a la vez
          desde perspectivas únicas: lingüística, histórica, teológica y pastoral.
        </p>

        <div className="main-search-container">
          <div className="main-search-wrapper">
            <Search className="main-search-icon" size={24} />
            <input 
              type="text" 
              className="main-search-input" 
              placeholder="Escribe un versículo bíblico (ej. Juan 3:16)"
              value={verse}
              onChange={(e) => { setVerse(e.target.value); setError(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !isSearching) handleGlobalSearch(); }}
              id="verse-search-input"
            />
            <button 
              className="main-search-button" 
              onClick={handleGlobalSearch}
              disabled={isSearching}
              id="verse-search-button"
            >
              {isSearching ? <Loader className="spin" size={20} /> : <ArrowRight size={20} />}
            </button>
          </div>
          
          {error && <div className="error-message">{error}</div>}
        </div>

        {!hasResults && (
          <button className="scroll-cta" onClick={scrollToAgents}>
            <span>Explorar agentes</span>
            <ChevronDown size={18} className="scroll-icon" />
          </button>
        )}
      </div>

      <div className="dashboard-content">
        {hasResults ? (
          <div className="results-list">
            <div className="section-header">
              <div className="agent-indicator" style={{ '--agent-color': 'var(--neon-green)' } as React.CSSProperties}>
                <div className="agent-indicator-dot" />
                <h3 className="section-subtitle">
                  Análisis Multidimensional {isSearching ? 'en proceso...' : 'completado'}
                </h3>
              </div>
              <div className="section-line" />
              <div className="result-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                {!googleConnected ? (
                  <button
                    className="action-btn"
                    onClick={connectGoogleAccount}
                    disabled={connectingGoogle}
                    style={{
                      background: 'linear-gradient(135deg, #4285f4, #34a853)',
                      border: 'none',
                      color: '#fff',
                      fontWeight: 600,
                      padding: '6px 14px',
                      borderRadius: '8px',
                      cursor: connectingGoogle ? 'wait' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '0.8rem',
                      boxShadow: '0 2px 8px rgba(66, 133, 244, 0.3)'
                    }}
                    title="Conecta tu cuenta de Google para exportar reportes a Docs"
                    id="connect-google-btn"
                  >
                    {connectingGoogle ? <Loader className="spin" size={14} /> : <LogIn size={14} />}
                    Conectar Google
                  </button>
                ) : (
                  <span 
                    style={{ 
                      fontSize: '0.78rem', 
                      color: 'var(--neon-green)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '4px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      background: 'rgba(0, 255, 150, 0.08)',
                      border: '1px solid rgba(0, 255, 150, 0.2)'
                    }}
                  >
                    <CheckCircle size={12} /> Google conectado
                  </span>
                )}
                <button 
                  className={`action-btn back-button ${isSearching ? 'disabled-btn' : ''}`}
                  onClick={() => { 
                    if (!isSearching) {
                      setGlobalResults({}); 
                      setVerseText(null);
                      onGoHome();
                    }
                  }}
                  disabled={isSearching}
                  style={{ opacity: isSearching ? 0.5 : 1, cursor: isSearching ? 'not-allowed' : 'pointer' }}
                >
                  <RotateCcw size={16} />
                  <span>Nueva búsqueda</span>
                </button>
              </div>
            </div>
            
            {/* Export success banner */}
            {showExportBanner && lastExportedUrl && (
              <div 
                className="export-banner"
                style={{
                  marginBottom: '16px',
                  padding: '14px 20px',
                  background: 'linear-gradient(135deg, rgba(52, 168, 83, 0.15), rgba(66, 133, 244, 0.15))',
                  borderRadius: '12px',
                  border: '1px solid rgba(52, 168, 83, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '10px',
                  animation: 'fadeIn 0.3s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <CheckCircle size={20} color="#34a853" />
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    ✅ Documento exportado exitosamente a Google Docs
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <a
                    href={lastExportedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      background: '#4285f4',
                      color: '#fff',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      transition: 'all 0.2s'
                    }}
                    id="open-docs-link"
                  >
                    <ExternalLink size={14} /> Abrir en Google Docs
                  </a>
                  <button
                    onClick={() => { setShowExportBanner(false); setLastExportedUrl(null); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: '1.1rem',
                      padding: '4px 8px'
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
            
            {verse && (
              <div className="verse-reference-box" style={{ 
                marginBottom: '24px', 
                padding: '20px 24px', 
                backgroundColor: 'rgba(255, 255, 255, 0.05)', 
                borderRadius: '12px', 
                borderLeft: '4px solid var(--neon-blue)',
                boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
              }}>
                <h4 style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '10px' }}>📖 TEXTO EN ANÁLISIS</h4>
                <p style={{ margin: '0 0 12px 0', fontSize: '1.05rem', fontWeight: 600, color: 'var(--neon-blue)' }}>
                  {verse}
                </p>
                {loadingVerseText ? (
                  <p style={{ margin: 0, fontSize: '0.95rem', fontStyle: 'italic', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Loader className="spin" size={14} /> Obteniendo texto bíblico...
                  </p>
                ) : verseText ? (
                  <p style={{ margin: 0, fontSize: '1.1rem', fontStyle: 'italic', lineHeight: 1.7, color: 'var(--text-primary)', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px' }}>
                    "{verseText}"
                  </p>
                ) : null}
              </div>
            )}

            <div className="agents-accordion-container">
              {agents.map((agent, idx) => {
                const res = globalResults[agent.title];
                
                // Resumen agent: always show a special card when there are results
                if (agent.title === "Resumen") {
                  const resumenRes = globalResults["Resumen"];
                  const isResumenExpanded = expandedAgent === "Resumen";
                  const otherAgents = agents.filter(a => a.title !== "Resumen");
                  const allOthersDone = otherAgents.every(a => {
                    const r = globalResults[a.title];
                    return r && !r.loading;
                  });

                  return (
                    <div key={idx} className={`agent-accordion-item ${isResumenExpanded ? 'expanded' : ''} ${resumenRes?.loading ? 'loading' : 'done'}`} style={{ border: '2px solid var(--neon-red)', marginTop: '8px' }}>
                      <div 
                        className="agent-accordion-header" 
                        onClick={() => {
                          if (resumenRes?.result && !resumenRes.loading) {
                            setExpandedAgent(isResumenExpanded ? null : "Resumen");
                          }
                        }}
                        style={{ '--agent-color': agent.color } as React.CSSProperties}
                      >
                        <div className="header-icon">{agent.icon}</div>
                        <div className="header-info" style={{ flex: 1 }}>
                          <h4>{agent.title} <span className="subtitle">{agent.subtitle}</span></h4>
                          <p>{agent.description}</p>
                          
                          {/* Agent approval checklist */}
                          <div className="resumen-checklist" style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '6px',
                            marginTop: '12px'
                          }}>
                            {otherAgents.map((oa, oaIdx) => {
                              const oaRes = globalResults[oa.title];
                              const isApproved = oaRes?.approved;
                              const isDone = oaRes && !oaRes.loading && oaRes.result;
                              const isLoading = oaRes?.loading;
                              const hasError = oaRes?.error;
                              return (
                                <div key={oaIdx} style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '3px 10px',
                                  borderRadius: '20px',
                                  fontSize: '0.72rem',
                                  fontWeight: isApproved ? 700 : 500,
                                  background: isApproved 
                                    ? 'rgba(0, 255, 150, 0.12)' 
                                    : hasError 
                                      ? 'rgba(255, 68, 102, 0.1)' 
                                      : 'rgba(255, 255, 255, 0.04)',
                                  border: `1px solid ${isApproved ? 'var(--neon-green)' : hasError ? 'rgba(255, 68, 102, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                                  color: isApproved 
                                    ? 'var(--neon-green)' 
                                    : hasError 
                                      ? 'var(--neon-red)' 
                                      : 'var(--text-secondary)',
                                  transition: 'all 0.3s ease'
                                }}>
                                  {isApproved ? (
                                    <CheckCircle size={11} />
                                  ) : isLoading ? (
                                    <Loader className="spin" size={11} />
                                  ) : hasError ? (
                                    <span style={{ fontSize: '11px' }}>✕</span>
                                  ) : isDone ? (
                                    <span style={{ fontSize: '11px', opacity: 0.5 }}>○</span>
                                  ) : (
                                    <span style={{ fontSize: '11px', opacity: 0.3 }}>·</span>
                                  )}
                                  {oa.title}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        
                        <div className="header-status">
                          {resumenRes?.loading ? (
                            <div className="status-loading" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span className="percent">{Math.round(resumenRes.progress)}%</span>
                              <div className="mini-progress-bar">
                                <div className="mini-progress-fill" style={{ width: `${resumenRes.progress}%`, backgroundColor: agent.color }} />
                              </div>
                            </div>
                          ) : resumenRes?.result ? (
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <span className="done-text">✓</span>
                              <button 
                                onClick={(e) => { e.stopPropagation(); invokeAgent("Resumen", true); }}
                                title="Rehacer resumen"
                                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', transition: 'all 0.2s' }}
                              >
                                <RefreshCw size={12} />
                              </button>
                              <ChevronDown className={`expand-chevron ${isResumenExpanded ? 'rotated' : ''}`} />
                            </div>
                          ) : (
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleGenerateSummary(); }}
                              disabled={numApproved === 0 || generatingSummary || isSearching || !allOthersDone}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 18px',
                                borderRadius: '10px',
                                border: 'none',
                                fontWeight: 700,
                                fontSize: '0.82rem',
                                cursor: (numApproved === 0 || isSearching || !allOthersDone) ? 'not-allowed' : 'pointer',
                                background: numApproved > 0 && allOthersDone
                                  ? 'linear-gradient(135deg, var(--neon-red), #ff6b6b)'
                                  : 'rgba(255, 255, 255, 0.06)',
                                color: numApproved > 0 && allOthersDone ? '#fff' : 'var(--text-secondary)',
                                boxShadow: numApproved > 0 && allOthersDone ? '0 0 20px rgba(255, 51, 102, 0.3)' : 'none',
                                transition: 'all 0.3s ease',
                                opacity: (numApproved === 0 || isSearching || !allOthersDone) ? 0.5 : 1
                              }}
                            >
                              {generatingSummary ? (
                                <><Loader className="spin" size={14} /> Generando...</>
                              ) : (
                                <><Layers size={14} /> Generar ({numApproved}/7)</>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {isResumenExpanded && resumenRes?.result && (
                        <div className="agent-accordion-content markdown-body">
                          <div className="agent-metrics" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                              📝 Palabras generadas: <strong>{resumenRes.wordCount}</strong>
                            </span>
                            <div className="agent-tool-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                               <button className="action-btn" onClick={(e) => { e.stopPropagation(); handleGenerateSummary(); }} disabled={numApproved === 0}>
                                 <RefreshCw size={14} /> Rehacer
                               </button>
                               <button className="action-btn" onClick={(e) => { e.stopPropagation(); setAgentEditing("Resumen", !resumenRes.isEditing); }}>
                                 <Edit2 size={14} /> Editar
                               </button>
                               <button className="action-btn gdocs-btn" onClick={(e) => { e.stopPropagation(); exportAgentToDocs("Resumen", resumenRes.result!); }} disabled={exportingStates["Resumen"]}>
                                 {exportingStates["Resumen"] ? <Loader className="spin" size={14} /> : <FileText size={14} />} Docs
                               </button>
                               <button className="action-btn copy-btn" onClick={(e) => { e.stopPropagation(); handleCopy(resumenRes.result!); }}>
                                 {copied ? <Check size={14} /> : <Copy size={14} />} Copiar
                               </button>
                            </div>
                          </div>

                          {resumenRes.isEditing && (
                            <div className="agent-edit-panel" style={{ marginBottom: '20px', padding: '16px', backgroundColor: 'rgba(var(--accent-rgb), 0.05)', borderRadius: '8px', border: '1px solid var(--border-color)', animation: 'fadeIn 0.3s ease' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <Edit2 size={16} color="var(--neon-cyan)" />
                                <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 600 }}>Modo Canvas Activado</span>
                              </div>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <input 
                                  type="text" 
                                  className="main-search-input"
                                  style={{ flex: 1, fontSize: '0.9rem', padding: '8px 12px' }}
                                  placeholder="Instrucción general (Ej: Hazlo más enfocado en los jóvenes)..."
                                  value={resumenRes.editPrompt || ''}
                                  onChange={(e) => updateEditPrompt("Resumen", e.target.value)}
                                  onKeyDown={(e) => { if (e.key === 'Enter' && resumenRes.editPrompt) invokeAgent("Resumen", false, resumenRes.editPrompt); }}
                                />
                                <button 
                                  className="main-search-button"
                                  style={{ width: 'auto', padding: '0 16px' }}
                                  onClick={(e) => { e.stopPropagation(); invokeAgent("Resumen", false, resumenRes.editPrompt); }}
                                  disabled={!resumenRes.editPrompt}
                                >
                                  <Send size={16} /> Ajustar
                                </button>
                              </div>
                            </div>
                          )}

                          <div className="markdown-wrapper" style={{ position: 'relative', userSelect: 'text' }}>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {resumenRes.result || ''}
                            </ReactMarkdown>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }
                
                if (!res) return null;
                
                const isExpanded = expandedAgent === agent.title;
                
                return (
                  <div key={idx} className={`agent-accordion-item ${isExpanded ? 'expanded' : ''} ${res.loading ? 'loading' : 'done'}`}>
                    <div 
                      className="agent-accordion-header" 
                      onClick={() => !res.loading && setExpandedAgent(isExpanded ? null : agent.title)}
                      style={{ '--agent-color': agent.color } as React.CSSProperties}
                    >
                      <div className="header-icon">{agent.icon}</div>
                      <div className="header-info">
                        <h4>{agent.title} {agent.subtitle && <span className="subtitle">{agent.subtitle}</span>}</h4>
                        <p>{agent.description}</p>
                      </div>
                      
                      <div className="header-status">
                        {res.loading ? (
                          <div className="status-loading" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="percent">{Math.round(res.progress)}%</span>
                            <div className="mini-progress-bar">
                              <div className="mini-progress-fill" style={{ width: `${res.progress}%`, backgroundColor: agent.color }} />
                            </div>
                          </div>
                        ) : res.error ? (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span className="error-text">❌ Error</span>
                            <button 
                              onClick={(e) => { e.stopPropagation(); invokeAgent(agent.title, true); }}
                              title="Reintentar"
                              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', transition: 'all 0.2s' }}
                            >
                              <RefreshCw size={12} />
                            </button>
                          </div>
                        ) : res.result ? (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span className="done-text">✓</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleApproveAgent(agent.title, res.result!); }}
                              title={res.approved ? "Quitar aprobación" : "Aprobar y Exportar"}
                              style={{ background: res.approved ? 'rgba(0, 255, 150, 0.2)' : 'rgba(255,255,255,0.06)', border: `1px solid ${res.approved ? 'var(--neon-green)' : 'rgba(255,255,255,0.15)'}`, borderRadius: '6px', padding: '3px 10px', cursor: 'pointer', color: res.approved ? 'var(--neon-green)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: res.approved ? 'bold' : 'normal', transition: 'all 0.2s' }}
                            >
                              <CheckCircle size={12} /> {res.approved ? 'APROBADO' : 'Aprobar'}
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); invokeAgent(agent.title, true); }}
                              title="Rehacer análisis"
                              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', transition: 'all 0.2s' }}
                            >
                              <RefreshCw size={12} />
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic' }}>⏳ En fila...</span>
                          </div>
                        )}
                        
                        {!res.loading && !res.error && res.result && (
                          <ChevronDown className={`expand-chevron ${isExpanded ? 'rotated' : ''}`} />
                        )}
                      </div>
                    </div>
                    
                    {isExpanded && res.result && (
                      <div className="agent-accordion-content markdown-body">
                        <div className="agent-metrics" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            📝 Palabras generadas: <strong>{res.wordCount}</strong>
                          </span>
                          
                          <div className="agent-tool-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                             <button 
                               className="action-btn"
                               onClick={(e) => { e.stopPropagation(); invokeAgent(agent.title, true); }}
                               title="Volver a generar completamente"
                             >
                               <RefreshCw size={14} /> Rehacer
                             </button>
                             <button 
                               className="action-btn"
                               onClick={(e) => { e.stopPropagation(); setAgentEditing(agent.title, !res.isEditing); }}
                               title="Modificar o ajustar detalles"
                             >
                               <Edit2 size={14} /> Editar
                             </button>
                             
                             <button 
                               className={`action-btn ${res.approved ? 'approved-btn' : ''}`}
                               onClick={(e) => { e.stopPropagation(); toggleApproveAgent(agent.title, res.result!); }}
                               style={{ 
                                 backgroundColor: res.approved ? 'rgba(0, 255, 150, 0.2)' : '', 
                                 borderColor: res.approved ? 'var(--neon-green)' : '',
                                 color: res.approved ? 'var(--neon-green)' : '' 
                               }}
                               title={res.approved ? "Quitar aprobación" : "Aprobar el texto para incluirlo en el resumen y exportar a Docs"}
                             >
                               <CheckCircle size={14} /> {res.approved ? 'Desaprobar' : 'Aprobar'}
                             </button>
                             
                             <button
                               className="action-btn gdocs-btn"
                               onClick={(e) => { e.stopPropagation(); exportAgentToDocs(agent.title, res.result!); }}
                               title="Exportar a Google Docs"
                               disabled={exportingStates[agent.title]}
                             >
                               {exportingStates[agent.title] ? <Loader className="spin" size={14} /> : <FileText size={14} />} Docs
                             </button>
                             
                             <button 
                               className="action-btn copy-btn"
                               onClick={(e) => { e.stopPropagation(); handleCopy(res.result!); }}
                               title="Copiar texto"
                             >
                               {copied ? <Check size={14} /> : <Copy size={14} />} Copiar
                             </button>
                          </div>
                        </div>

                        {res.isEditing && (
                          <div className="agent-edit-panel" style={{ marginBottom: '20px', padding: '16px', backgroundColor: 'rgba(var(--accent-rgb), 0.05)', borderRadius: '8px', border: '1px solid var(--border-color)', animation: 'fadeIn 0.3s ease' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                              <Edit2 size={16} color="var(--neon-cyan)" />
                              <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 600 }}>Modo Canvas Activado</span>
                            </div>
                            
                            {!res.selectedText ? (
                              <>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>Selecciona cualquier fragmento del documento abajo para modificarlo específicamente, o escribe una instrucción para reescribir todo el informe.</p>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <input 
                                    type="text" 
                                    className="main-search-input"
                                    style={{ flex: 1, fontSize: '0.9rem', padding: '8px 12px' }}
                                    placeholder="Instrucción general (Ej: Hazlo más enfocado en los jóvenes)..."
                                    value={res.editPrompt || ''}
                                    onChange={(e) => updateEditPrompt(agent.title, e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' && res.editPrompt) invokeAgent(agent.title, false, res.editPrompt); }}
                                  />
                                  <button 
                                    className="main-search-button"
                                    style={{ width: 'auto', padding: '0 16px' }}
                                    onClick={(e) => { e.stopPropagation(); invokeAgent(agent.title, false, res.editPrompt); }}
                                    disabled={!res.editPrompt}
                                  >
                                    <Send size={16} /> Ajustar Todo
                                  </button>
                                </div>
                              </>
                            ) : (
                              <div style={{ marginTop: '4px' }}>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Fragmento seleccionado:</p>
                                <div style={{ padding: '10px 14px', background: 'rgba(0, 0, 0, 0.2)', borderRadius: '6px', fontStyle: 'italic', fontSize: '0.85rem', marginBottom: '12px', borderLeft: '3px solid var(--neon-cyan)', color: 'var(--text-main)' }}>
                                  "{res.selectedText.length > 180 ? res.selectedText.substring(0, 180) + '...' : res.selectedText}"
                                </div>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                                  <button className="action-btn" onClick={() => invokeAgent(agent.title, false, "Expande esta selección, explícala más a fondo y con más detalle.", true, res.selectedText, res.result!)}>Más detallado</button>
                                  <button className="action-btn" onClick={() => invokeAgent(agent.title, false, "Resume y haz más concisa esta selección específica.", true, res.selectedText, res.result!)}>Más corto</button>
                                  <button className="action-btn" onClick={() => invokeAgent(agent.title, false, "Reescribe esta selección con un tono estrictamente académico, formal e histórico.", true, res.selectedText, res.result!)}>Tono Académico</button>
                                  <button className="action-btn" onClick={() => invokeAgent(agent.title, false, "Reescribe esta selección con un tono más pastoral, cercano, coloquial y aplicable hoy.", true, res.selectedText, res.result!)}>Tono Pastoral</button>
                                  <button className="action-btn danger" onClick={() => setGlobalResults(prev => ({ ...prev, [agent.title]: { ...prev[agent.title], selectedText: undefined } }))} style={{ color: '#ff4466' }}>X Cancelar selección</button>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <input 
                                    type="text" 
                                    className="main-search-input"
                                    style={{ flex: 1, fontSize: '0.9rem', padding: '8px 12px' }}
                                    placeholder="O escribe una orden personalizada SÓLO para este fragmento..."
                                    value={res.editPrompt || ''}
                                    onChange={(e) => updateEditPrompt(agent.title, e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' && res.editPrompt) invokeAgent(agent.title, false, res.editPrompt, true, res.selectedText, res.result!); }}
                                  />
                                  <button 
                                    className="main-search-button"
                                    style={{ width: 'auto', padding: '0 16px', background: 'var(--neon-cyan)', color: '#000' }}
                                    onClick={(e) => { e.stopPropagation(); invokeAgent(agent.title, false, res.editPrompt, true, res.selectedText, res.result!); }}
                                    disabled={!res.editPrompt}
                                  >
                                    <Send size={16} /> Aplicar al fragmento
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        <div 
                          className="markdown-wrapper" 
                          onMouseUp={() => res.isEditing && handleTextSelection(agent.title)}
                          style={{ position: 'relative', cursor: res.isEditing ? 'text' : 'auto', userSelect: 'text' }}
                        >
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {res.result || ''}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <>
            <div className="section-header">
              <h3 className="section-subtitle">Tus Herramientas de Rema</h3>
              <div className="section-line" />
            </div>
            
            <div className="agents-grid">
              {agents.map((agent, index) => (
                <div key={index}>
                  <AgentCard 
                    title={agent.title}
                    subtitle={agent.subtitle}
                    description={agent.description}
                    icon={agent.icon}
                    neonColor={agent.color}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
