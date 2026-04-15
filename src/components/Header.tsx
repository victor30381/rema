import { Bell, Search, Menu } from 'lucide-react';
import './Header.css';

interface HeaderProps {
  onMenuToggle: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  return (
    <header className="header">
      <div className="header-left">
        <button className="menu-toggle" onClick={onMenuToggle} aria-label="Abrir menú">
          <Menu size={22} />
        </button>
        <div className="user-profile">
          <div className="avatar">
            <div className="avatar-placeholder" />
          </div>
          <div className="user-info">
            <span className="user-name">Bienvenido</span>
            <span className="user-role">Explorador de la Palabra</span>
          </div>
        </div>
      </div>

      <div className="header-actions">
        <button className="notification-btn" aria-label="Notificaciones">
          <Bell size={20} className="bell-icon" />
          <span className="notification-dot"></span>
        </button>
        
        <div className="mini-search">
          <Search size={18} className="search-icon" />
          <input type="text" placeholder="Buscar..." />
        </div>
      </div>
    </header>
  );
}
