import { useState } from 'react';
import { X, Settings, Palette, Type, Zap, Trash2, Download, Info, Monitor, Moon, Sun, BookOpen, Globe, Gauge, RotateCcw, AlertTriangle } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import './SettingsView.css';

const ACCENT_COLORS = [
  { name: 'Cian', value: '#00deff' },
  { name: 'Rosa', value: '#ed1576' },
  { name: 'Púrpura', value: '#9048e5' },
  { name: 'Azul', value: '#3661f4' },
  { name: 'Verde', value: '#37c871' },
  { name: 'Naranja', value: '#f28b24' },
  { name: 'Amarillo', value: '#f6c836' },
  { name: 'Rojo', value: '#f44e3b' },
];

interface SettingsViewProps {
  isOpen: boolean;
  onClose: () => void;
  historyCount: number;
  onClearHistory: () => void;
}

export function SettingsView({ isOpen, onClose, historyCount, onClearHistory }: SettingsViewProps) {
  const { settings, updateSetting, resetSettings } = useSettings();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearAnimation, setClearAnimation] = useState(false);

  const handleClearHistory = () => {
    setClearAnimation(true);
    setTimeout(() => {
      onClearHistory();
      setShowClearConfirm(false);
      setClearAnimation(false);
    }, 600);
  };

  if (!isOpen) return null;

  return (
    <div className="settings-overlay">
      <div className="settings-backdrop" onClick={onClose} />
      <div className="settings-fullscreen">
        {/* Header */}
        <div className="settings-fs-header">
          <div className="settings-fs-title-group">
            <div className="settings-fs-icon">
              <Settings size={28} />
            </div>
            <div>
              <h2 className="settings-fs-title">Ajustes</h2>
              <p className="settings-fs-subtitle">Personaliza tu experiencia de estudio</p>
            </div>
          </div>
          <button className="settings-fs-close" onClick={onClose} aria-label="Cerrar ajustes">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="settings-fs-content">
          <div className="settings-grid">
            
            {/* === Appearance Section === */}
            <div className="settings-section" style={{ animationDelay: '0.05s' }}>
              <div className="settings-section-header">
                <Palette size={20} />
                <h3>Apariencia</h3>
              </div>

              {/* Theme */}
              <div className="settings-item">
                <div className="settings-item-info">
                  <span className="settings-item-label">Tema</span>
                  <span className="settings-item-desc">Elige el esquema de colores de la interfaz</span>
                </div>
                <div className="settings-theme-picker">
                  <button
                    className={`theme-option ${settings.theme === 'dark' ? 'active' : ''}`}
                    onClick={() => updateSetting('theme', 'dark')}
                    title="Oscuro"
                  >
                    <Moon size={16} />
                    <span>Oscuro</span>
                  </button>
                  <button
                    className={`theme-option ${settings.theme === 'light' ? 'active' : ''}`}
                    onClick={() => updateSetting('theme', 'light')}
                    title="Claro"
                  >
                    <Sun size={16} />
                    <span>Claro</span>
                  </button>
                  <button
                    className={`theme-option ${settings.theme === 'auto' ? 'active' : ''}`}
                    onClick={() => updateSetting('theme', 'auto')}
                    title="Automático"
                  >
                    <Monitor size={16} />
                    <span>Auto</span>
                  </button>
                </div>
              </div>

              {/* Accent Color */}
              <div className="settings-item">
                <div className="settings-item-info">
                  <span className="settings-item-label">Color de acento</span>
                  <span className="settings-item-desc">Personaliza el color principal de la interfaz</span>
                </div>
                <div className="settings-color-picker">
                  {ACCENT_COLORS.map(color => (
                    <button
                      key={color.value}
                      className={`color-swatch ${settings.accentColor === color.value ? 'active' : ''}`}
                      style={{ '--swatch-color': color.value } as React.CSSProperties}
                      onClick={() => updateSetting('accentColor', color.value)}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {/* Animations */}
              <div className="settings-item">
                <div className="settings-item-info">
                  <span className="settings-item-label">Animaciones</span>
                  <span className="settings-item-desc">Efectos visuales y transiciones</span>
                </div>
                <button
                  className={`settings-toggle ${settings.animationsEnabled ? 'active' : ''}`}
                  onClick={() => updateSetting('animationsEnabled', !settings.animationsEnabled)}
                >
                  <div className="toggle-track">
                    <div className="toggle-thumb" />
                  </div>
                </button>
              </div>
            </div>

            {/* === Reading Section === */}
            <div className="settings-section" style={{ animationDelay: '0.1s' }}>
              <div className="settings-section-header">
                <Type size={20} />
                <h3>Lectura</h3>
              </div>

              {/* Font Size */}
              <div className="settings-item">
                <div className="settings-item-info">
                  <span className="settings-item-label">Tamaño de fuente</span>
                  <span className="settings-item-desc">Ajusta el tamaño del texto en los informes</span>
                </div>
                <div className="settings-segmented">
                  <button
                    className={`segmented-option ${settings.fontSize === 'small' ? 'active' : ''}`}
                    onClick={() => updateSetting('fontSize', 'small')}
                  >
                    <span style={{ fontSize: '12px' }}>A</span>
                  </button>
                  <button
                    className={`segmented-option ${settings.fontSize === 'medium' ? 'active' : ''}`}
                    onClick={() => updateSetting('fontSize', 'medium')}
                  >
                    <span style={{ fontSize: '16px' }}>A</span>
                  </button>
                  <button
                    className={`segmented-option ${settings.fontSize === 'large' ? 'active' : ''}`}
                    onClick={() => updateSetting('fontSize', 'large')}
                  >
                    <span style={{ fontSize: '20px' }}>A</span>
                  </button>
                </div>
              </div>

              {/* Language */}
              <div className="settings-item">
                <div className="settings-item-info">
                  <span className="settings-item-label">Idioma de análisis</span>
                  <span className="settings-item-desc">Idioma en que los agentes generan los informes</span>
                </div>
                <div className="settings-segmented">
                  <button
                    className={`segmented-option ${settings.language === 'es' ? 'active' : ''}`}
                    onClick={() => updateSetting('language', 'es')}
                  >
                    <Globe size={14} />
                    <span>Español</span>
                  </button>
                  <button
                    className={`segmented-option ${settings.language === 'en' ? 'active' : ''}`}
                    onClick={() => updateSetting('language', 'en')}
                  >
                    <Globe size={14} />
                    <span>English</span>
                  </button>
                </div>
              </div>
            </div>

            {/* === AI Section === */}
            <div className="settings-section" style={{ animationDelay: '0.15s' }}>
              <div className="settings-section-header">
                <Zap size={20} />
                <h3>Agentes de IA</h3>
              </div>

              {/* Response Length */}
              <div className="settings-item">
                <div className="settings-item-info">
                  <span className="settings-item-label">Extensión de respuesta</span>
                  <span className="settings-item-desc">Controla la longitud de los informes generados</span>
                </div>
                <div className="settings-segmented response-length">
                  <button
                    className={`segmented-option ${settings.responseLength === 'concise' ? 'active' : ''}`}
                    onClick={() => updateSetting('responseLength', 'concise')}
                  >
                    <Gauge size={14} />
                    <span>Conciso</span>
                  </button>
                  <button
                    className={`segmented-option ${settings.responseLength === 'standard' ? 'active' : ''}`}
                    onClick={() => updateSetting('responseLength', 'standard')}
                  >
                    <Gauge size={14} />
                    <span>Estándar</span>
                  </button>
                  <button
                    className={`segmented-option ${settings.responseLength === 'detailed' ? 'active' : ''}`}
                    onClick={() => updateSetting('responseLength', 'detailed')}
                  >
                    <Gauge size={14} />
                    <span>Detallado</span>
                  </button>
                </div>
              </div>

              {/* Auto-save */}
              <div className="settings-item">
                <div className="settings-item-info">
                  <span className="settings-item-label">Guardar automáticamente</span>
                  <span className="settings-item-desc">Guarda cada estudio en el historial al finalizar</span>
                </div>
                <button
                  className={`settings-toggle ${settings.autoSaveHistory ? 'active' : ''}`}
                  onClick={() => updateSetting('autoSaveHistory', !settings.autoSaveHistory)}
                >
                  <div className="toggle-track">
                    <div className="toggle-thumb" />
                  </div>
                </button>
              </div>
            </div>

            {/* === Data Section === */}
            <div className="settings-section" style={{ animationDelay: '0.2s' }}>
              <div className="settings-section-header">
                <Download size={20} />
                <h3>Datos e Historial</h3>
              </div>

              {/* History info */}
              <div className="settings-item">
                <div className="settings-item-info">
                  <span className="settings-item-label">Estudios guardados</span>
                  <span className="settings-item-desc">
                    {historyCount === 0 
                      ? 'No hay estudios en tu historial' 
                      : `${historyCount} estudio${historyCount > 1 ? 's' : ''} almacenado${historyCount > 1 ? 's' : ''} localmente`
                    }
                  </span>
                </div>
                <div className="settings-history-badge">
                  <BookOpen size={14} />
                  <span>{historyCount}</span>
                </div>
              </div>

              {/* Clear History */}
              <div className="settings-item danger-zone">
                {!showClearConfirm ? (
                  <>
                    <div className="settings-item-info">
                      <span className="settings-item-label">Borrar historial</span>
                      <span className="settings-item-desc">Elimina todos los estudios guardados permanentemente</span>
                    </div>
                    <button
                      className="settings-danger-btn"
                      onClick={() => setShowClearConfirm(true)}
                      disabled={historyCount === 0}
                    >
                      <Trash2 size={15} />
                      <span>Borrar todo</span>
                    </button>
                  </>
                ) : (
                  <div className={`settings-confirm-panel ${clearAnimation ? 'clearing' : ''}`}>
                    <div className="confirm-warning">
                      <AlertTriangle size={20} />
                      <div>
                        <strong>¿Estás seguro?</strong>
                        <p>Se eliminarán {historyCount} estudio{historyCount > 1 ? 's' : ''} de forma permanente.</p>
                      </div>
                    </div>
                    <div className="confirm-actions">
                      <button className="confirm-cancel" onClick={() => setShowClearConfirm(false)}>
                        Cancelar
                      </button>
                      <button className="confirm-delete" onClick={handleClearHistory}>
                        <Trash2 size={14} />
                        Confirmar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Reset Settings */}
              <div className="settings-item">
                <div className="settings-item-info">
                  <span className="settings-item-label">Restablecer ajustes</span>
                  <span className="settings-item-desc">Vuelve a la configuración predeterminada</span>
                </div>
                <button className="settings-reset-btn" onClick={resetSettings}>
                  <RotateCcw size={15} />
                  <span>Restablecer</span>
                </button>
              </div>
            </div>

            {/* === About Section === */}
            <div className="settings-section about-section" style={{ animationDelay: '0.25s' }}>
              <div className="settings-section-header">
                <Info size={20} />
                <h3>Acerca de Rema</h3>
              </div>
              <div className="settings-about-content">
                <div className="about-logo">
                  <BookOpen size={32} />
                  <div>
                    <h4>Rema</h4>
                    <span className="about-version">v1.0.0 — AI Bible Engine</span>
                  </div>
                </div>
                <p className="about-description">
                  Rema es una plataforma de estudio bíblico potenciada por inteligencia artificial. 
                  Utiliza múltiples agentes especializados para ofrecer análisis profundos desde 
                  perspectivas lingüísticas, históricas, teológicas y pastorales.
                </p>
                <div className="about-credits">
                  <span>Desarrollado con ❤️ para el estudio de la Palabra</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
