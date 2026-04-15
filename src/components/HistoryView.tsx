import { X, Trash2, BookOpen, Clock, ChevronRight, ScrollText } from 'lucide-react';
import type { HistoryEntry } from '../App';
import './HistoryView.css';

interface HistoryViewProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryEntry[];
  onSelectEntry: (entry: HistoryEntry) => void;
  onDeleteEntry: (id: string) => void;
}

export function HistoryView({ isOpen, onClose, history, onSelectEntry, onDeleteEntry }: HistoryViewProps) {

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Justo ahora';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const getAgentCount = (entry: HistoryEntry) => {
    return Object.keys(entry.results).length;
  };

  const getApprovedCount = (entry: HistoryEntry) => {
    return Object.values(entry.results).filter(r => r.approved).length;
  };

  // Color palette for card accents based on index
  const accentColors = [
    'var(--neon-cyan)',
    'var(--neon-pink)',
    'var(--neon-purple)',
    'var(--neon-blue)',
    'var(--neon-orange)',
    'var(--neon-green)',
    'var(--neon-yellow)',
    'var(--neon-red)',
  ];

  if (!isOpen) return null;

  return (
    <div className="history-overlay">
      <div className="history-backdrop" onClick={onClose} />
      <div className="history-fullscreen">
        {/* Header */}
        <div className="history-fs-header">
          <div className="history-fs-title-group">
            <div className="history-fs-icon">
              <ScrollText size={28} />
            </div>
            <div>
              <h2 className="history-fs-title">Historial de Estudios</h2>
              <p className="history-fs-subtitle">
                {history.length === 0 
                  ? 'Aún no has realizado ningún estudio'
                  : `${history.length} estudio${history.length > 1 ? 's' : ''} realizado${history.length > 1 ? 's' : ''}`
                }
              </p>
            </div>
          </div>
          <button className="history-fs-close" onClick={onClose} aria-label="Cerrar historial">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="history-fs-content">
          {history.length === 0 ? (
            <div className="history-fs-empty">
              <div className="history-fs-empty-icon">
                <BookOpen size={64} />
              </div>
              <h3>Sin estudios aún</h3>
              <p>Busca un versículo bíblico para comenzar tu primer análisis profundo con los agentes de IA.</p>
            </div>
          ) : (
            <div className="history-fs-grid">
              {history.map((entry, idx) => {
                const accentColor = accentColors[idx % accentColors.length];
                const agentCount = getAgentCount(entry);
                const approvedCount = getApprovedCount(entry);

                return (
                  <div
                    key={entry.id}
                    className="history-card"
                    style={{ '--card-accent': accentColor, animationDelay: `${idx * 0.06}s` } as React.CSSProperties}
                    onClick={() => {
                      onSelectEntry(entry);
                      onClose();
                    }}
                  >
                    {/* Accent top bar */}
                    <div className="history-card-accent" />

                    {/* Card content */}
                    <div className="history-card-body">
                      <div className="history-card-top">
                        <div className="history-card-verse-icon">
                          <BookOpen size={18} />
                        </div>
                        <button
                          className="history-card-delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteEntry(entry.id);
                          }}
                          title="Eliminar del historial"
                          aria-label="Eliminar"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      <h3 className="history-card-verse">{entry.verse}</h3>
                      
                      {entry.verseText && (
                        <p className="history-card-text">
                          "{entry.verseText.length > 120 ? entry.verseText.slice(0, 120) + '...' : entry.verseText}"
                        </p>
                      )}

                      <div className="history-card-meta">
                        <div className="history-card-date">
                          <Clock size={13} />
                          <span>{formatDate(entry.date)}</span>
                        </div>
                        <div className="history-card-stats">
                          <span className="history-card-agents">{agentCount} agentes</span>
                          {approvedCount > 0 && (
                            <span className="history-card-approved">✓ {approvedCount}</span>
                          )}
                        </div>
                      </div>

                      <div className="history-card-open">
                        <span>Ver estudio</span>
                        <ChevronRight size={16} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
