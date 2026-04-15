import { Bell, Search, Menu } from 'lucide-react';
import './Header.css';
import logoUrl from '../assets/logo.png';

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
            <img src={logoUrl} alt="Rema Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div className="user-info">
            <span className="user-name">Bienvenido</span>
            <span className="user-role">Explorador de la Palabra</span>
          </div>
        </div>
      </div>

      <div className="header-actions">
        <div className="mini-search">
          <Search size={18} className="search-icon" />
          <input type="text" placeholder="Buscar..." />
        </div>
      </div>
    </header>
  );
}
