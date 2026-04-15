import { Home, History, Settings, X, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import './Sidebar.css';
import logoUrl from '../assets/logo.png';

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
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return (
    <aside className={`sidebar ${isOpen ? 'sidebar--open' : ''}`}>
      <div className="sidebar-top">
        <div className="logo-container">
          <div className="logo-icon">
            <img src={logoUrl} alt="Rema Logo" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
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
        <div className="sidebar-user-info">
          {user?.photoURL && (
            <img src={user.photoURL} alt="" className="sidebar-user-avatar" referrerPolicy="no-referrer" />
          )}
          <span className="sidebar-user-name">{user?.displayName || user?.email || 'Usuario'}</span>
        </div>
        <button className="nav-item logout-btn" onClick={handleLogout} id="logout-button">
          <LogOut size={20} />
          <span>Cerrar sesión</span>
        </button>
        <div className="sidebar-version">
          <span className="version-badge">v1.0</span>
          <span className="version-text">AI Engine</span>
        </div>
      </div>
    </aside>
  );
}
