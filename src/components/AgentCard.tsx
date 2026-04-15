import type { ReactNode } from 'react';
import './AgentCard.css';

interface AgentCardProps {
  title: string;
  subtitle?: string;
  description?: string;
  icon: ReactNode;
  neonColor: string;
}

export function AgentCard({ title, subtitle, description, icon, neonColor }: AgentCardProps) {
  return (
    <div 
      className="agent-card"
      style={{ 
        '--card-neon-color': neonColor,
        '--card-glow': `${neonColor}33`,
        '--card-border': `${neonColor}80`
      } as React.CSSProperties}
    >
      <div className="agent-icon" style={{ color: neonColor }}>
        {icon}
      </div>
      <div className="agent-info">
        <h3 className="agent-title">{title}</h3>
        {subtitle && <p className="agent-subtitle">{subtitle}</p>}
        {description && <p className="agent-description">{description}</p>}
      </div>
      <div className="agent-card-arrow" style={{ color: neonColor }}>→</div>
    </div>
  );
}
