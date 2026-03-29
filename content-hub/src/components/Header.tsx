import type { CSSProperties } from 'react';
import { useContentStore } from '../store/useContentStore';
import { RefreshIcon } from './icons/PlatformIcons';

export type ViewMode = 'home' | 'timeline' | 'calendar' | 'analytics' | 'financial' | 'audience' | 'viral-radar' | 'crosspost' | 'brolls' | 'productions' | 'roteiro-lab' | 'infoprodutos';

const header: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 24px',
  height: '56px',
  background: 'var(--bg-secondary)',
  borderBottom: '1px solid var(--border)',
  boxShadow: 'var(--shadow-sm)',
};

const logoArea: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
};

const logoMark: CSSProperties = {
  width: '32px',
  height: '32px',
  borderRadius: '10px',
  background: 'linear-gradient(135deg, var(--accent-gold), var(--accent-gold-dark))',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '15px',
  fontWeight: 800,
  color: '#fff',
  boxShadow: 'var(--shadow-gold)',
  fontFamily: 'var(--font)',
};

const titleStyle: CSSProperties = {
  fontSize: '17px',
  fontWeight: 800,
  color: 'var(--text-primary)',
  letterSpacing: '-0.02em',
  fontFamily: 'var(--font)',
};

const subtitleStyle: CSSProperties = {
  fontSize: '13px',
  color: 'var(--text-muted)',
  fontWeight: 400,
  marginLeft: '6px',
  fontFamily: 'var(--font-body)',
};

const tabsArea: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '2px',
  background: 'var(--bg-primary)',
  borderRadius: 'var(--radius)',
  padding: '3px',
};

const tab: CSSProperties = {
  background: 'transparent',
  border: 'none',
  borderRadius: '6px',
  color: 'var(--text-muted)',
  padding: '7px 18px',
  fontSize: '13px',
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'var(--font)',
  transition: 'all var(--transition)',
};

const tabActive: CSSProperties = {
  ...tab,
  background: 'var(--bg-secondary)',
  color: 'var(--accent-gold-dark)',
  fontWeight: 700,
  boxShadow: 'var(--shadow-sm)',
};

const rightArea: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '14px',
};

const statusStyle: CSSProperties = {
  fontSize: '12px',
  color: 'var(--text-muted)',
  fontVariantNumeric: 'tabular-nums',
};

const refreshBtn: CSSProperties = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  color: 'var(--text-secondary)',
  padding: '7px 14px',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  transition: 'all var(--transition)',
  fontFamily: 'var(--font)',
  boxShadow: 'var(--shadow-sm)',
};

interface HeaderProps {
  onRefresh: () => void;
  viewMode: ViewMode;
  onViewChange: (mode: ViewMode) => void;
}

const tabs: { mode: ViewMode; label: string }[] = [
  { mode: 'home', label: 'Home' },
  { mode: 'timeline', label: 'Timeline' },
  { mode: 'calendar', label: 'Calendario' },
  { mode: 'analytics', label: 'Analytics' },
  { mode: 'financial', label: 'Financeiro' },
  { mode: 'audience', label: 'Audiência' },
  { mode: 'viral-radar', label: 'Viral Radar' },
  { mode: 'crosspost', label: 'Cross-post' },
  { mode: 'productions', label: 'Produções' },
  { mode: 'brolls', label: 'B-Rolls' },
  { mode: 'roteiro-lab', label: 'Roteiro Lab' },
  { mode: 'infoprodutos', label: 'Infoprodutos' },
];

export function Header({ onRefresh, viewMode, onViewChange }: HeaderProps) {
  const lastFetch = useContentStore((s) => s.lastFetch);
  const loading = useContentStore((s) => s.loading);

  return (
    <header style={header}>
      <div style={logoArea}>
        <div style={logoMark}>C</div>
        <span style={titleStyle}>
          Content Hub
          <span style={subtitleStyle}>OpenSquad</span>
        </span>
      </div>

      <div style={tabsArea}>
        {tabs.map(({ mode, label }) => (
          <button
            key={mode}
            style={viewMode === mode ? tabActive : tab}
            onClick={() => onViewChange(mode)}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={rightArea}>
        <span style={statusStyle}>
          {lastFetch ? new Date(lastFetch).toLocaleTimeString('pt-BR') : ''}
        </span>
        <button
          style={{
            ...refreshBtn,
            opacity: loading ? 0.5 : 1,
            pointerEvents: loading ? 'none' : 'auto',
          }}
          onClick={onRefresh}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent-gold)';
            e.currentTarget.style.color = 'var(--accent-gold-dark)';
            e.currentTarget.style.boxShadow = 'var(--shadow-gold)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.color = 'var(--text-secondary)';
            e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
          }}
        >
          <RefreshIcon size={14} />
          {loading ? 'Atualizando...' : 'Atualizar'}
        </button>
      </div>
    </header>
  );
}
