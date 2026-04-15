import { Home, History, Settings, HelpCircle, BookOpen, X } from 'lucide-react';
import './Sidebar.css';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  historyCount: number;
  activeView: 'home' | 'history';
  onViewChange: (view: 'home' | 'history') => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
}

export function Sidebar({ isOpen, onClose, historyCount, activeView, onViewChange, onOpenHistory, onOpenSettings }: SidebarProps) {
  return (
    <aside className={`sidebar ${isOpen ? 'sidebar--open' : ''}`}>
      <div className="sidebar-top">
        <div className="logo-container">
          <div className="logo-icon">
            <BookOpen color="var(--neon-cyan)" size={28} />
          </div>
          <h1 className="logo-text">Rema</h1>
        </div>
        <button className="sidebar-close-btn" onClick={onClose} aria-label="Cerrar menú">
          <X size={20} />
        </button>
      </div>

      <nav className="nav-menu">
        <button 
          className={`nav-item ${activeView === 'home' ? 'active' : ''}`}
          onClick={() => onViewChange('home')}
        >
          <Home size={20} />
          <span>Inicio</span>
        </button>
        
        <button 
          className="nav-item"
          onClick={() => {
            onOpenHistory();
            onClose();
          }}
        >
          <History size={20} />
          <span>Historial</span>
          {historyCount > 0 && (
            <span className="history-count">{historyCount}</span>
          )}
        </button>

        <button 
          className="nav-item"
          onClick={() => {
            onOpenSettings();
            onClose();
          }}
        >
          <Settings size={20} />
          <span>Ajustes</span>
        </button>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-version">
          <span className="version-badge">v1.0</span>
          <span className="version-text">AI Engine</span>
        </div>
        <button className="nav-item help-btn">
          <HelpCircle size={20} />
          <span>Ayuda</span>
        </button>
      </div>
    </aside>
  );
}
