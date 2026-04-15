import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { HistoryView } from './components/HistoryView';
import { SettingsView } from './components/SettingsView';
import { LoginPage } from './components/LoginPage';
import { useAuth } from './contexts/AuthContext';
import { db } from './firebase';
import { collection, onSnapshot, query, orderBy, where, setDoc, deleteDoc, doc } from 'firebase/firestore';
import './App.css';

export interface HistoryEntry {
  id: string;
  verse: string;
  verseText: string | null;
  date: string;
  results: Record<string, {
    result: string | null;
    wordCount?: number;
    approved?: boolean;
  }>;
}


// Using Firestore instead of localStorage so we don't need these anymore.
// We keep the HistoryEntry interface to minimize refactoring Dashboard/HistoryView.

function App() {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [activeView, setActiveView] = useState<'home' | 'history'>('home');
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    if (!user) return; // Don't subscribe to Firestore if not logged in
    const q = query(collection(db, 'studies'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(document => {
        const d = document.data();
        
        // Convert stored 'results' format to Web App 'HistoryEntry.results' format
        const resultsMap: any = {};
        if (d.results) {
          Object.keys(d.results).forEach(agent => {
             resultsMap[agent] = {
                result: d.results[agent].text || null,
                approved: d.results[agent].status === 'approved',
                wordCount: d.results[agent].text ? d.results[agent].text.split(/\s+/).length : 0
             }
          });
        }
        
        if (d.resumen) {
           resultsMap["Resumen Absoluto"] = {
              result: d.resumen,
              approved: true,
              wordCount: d.resumen.split(/\s+/).length
           };
        }

        let entryDate = new Date().toISOString();
        if (d.createdAt) {
          if (typeof d.createdAt.toDate === 'function') {
            entryDate = d.createdAt.toDate().toISOString();
          } else if (d.createdAt.seconds) { // sometimes timestamp is raw js object
             entryDate = new Date(d.createdAt.seconds * 1000).toISOString();
          } else {
             entryDate = new Date(d.createdAt).toISOString();
          }
        }

        return {
          id: document.id,
          verse: d.verse || 'Sin título',
          verseText: d.verseText || null, 
          date: entryDate,
          results: resultsMap
        };
      });
      setHistory(data as HistoryEntry[]);
    });
    return unsubscribe;
  }, [user]);

  // Auth gating — show login page if not authenticated or still loading
  if (loading || !user) {
    return <LoginPage />;
  }

  const addToHistory = async (entry: HistoryEntry) => {
    const resultsMap: any = {};
    Object.keys(entry.results).forEach(agent => {
        resultsMap[agent] = {
           text: entry.results[agent].result,
           status: entry.results[agent].approved ? 'approved' : 'completed'
        }
    });

    // Check if we have Resumen Absoluto
    let resumenText = null;
    if (resultsMap["Resumen"] && resultsMap["Resumen"].text) {
        resumenText = resultsMap["Resumen"].text;
        delete resultsMap["Resumen"];
    }
    
    await setDoc(doc(db, 'studies', entry.id), {
       verse: entry.verse,
       verseText: entry.verseText || null,
       status: 'completed',
       createdAt: new Date(entry.date),
       results: resultsMap,
       ...(resumenText ? { resumen: resumenText } : {}),
       userId: user.uid,
       chatId: 'pc_app'
    });
  };

  const deleteFromHistory = async (id: string) => {
    await deleteDoc(doc(db, 'studies', id));
    if (selectedEntry?.id === id) {
      setSelectedEntry(null);
    }
  };

  const clearAllHistory = async () => {
    // Only clear visually on frontend, or you could do batch delete. We will just close selected.
    setSelectedEntry(null);
  };

  const handleSelectEntry = (entry: HistoryEntry) => {
    setSelectedEntry(entry);
    setActiveView('home');
    setSidebarOpen(false);
    setHistoryOpen(false);
  };

  const handleGoHome = () => {
    setSelectedEntry(null);
    setActiveView('home');
  };

  return (
    <div className="app-container">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        historyCount={history.length}
        activeView={activeView}
        onViewChange={(view) => { setActiveView(view); if (view === 'home') setSelectedEntry(null); setSidebarOpen(false); }}
        onOpenHistory={() => setHistoryOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <div className="main-layout">
        <Header onMenuToggle={() => setSidebarOpen(prev => !prev)} />
        <Dashboard 
          onSaveToHistory={addToHistory}
          loadedEntry={selectedEntry}
          onClearLoaded={() => setSelectedEntry(null)}
          onGoHome={handleGoHome}
        />
      </div>

      {/* Fullscreen History Overlay */}
      <HistoryView
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        history={history}
        onSelectEntry={handleSelectEntry}
        onDeleteEntry={deleteFromHistory}
      />

      {/* Fullscreen Settings Overlay */}
      <SettingsView
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        historyCount={history.length}
        onClearHistory={clearAllHistory}
      />
    </div>
  );
}

export default App;
