import type { CSSProperties, ReactNode } from 'react';

interface SyncButtonProps {
  label: string;
  onClick: () => void;
  loading: boolean;
  lastSync?: string;
}

interface PlatformColumnProps {
  name: string;
  icon: ReactNode;
  accentColor: string;
  count: number;
  children: ReactNode;
  syncButton?: SyncButtonProps;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const column: CSSProperties = {
  flex: 1, minWidth: 280, maxWidth: 420,
  display: 'flex', flexDirection: 'column', gap: '10px', height: '100%',
};

const columnCollapsed: CSSProperties = {
  minWidth: 280, maxWidth: 420,
  display: 'flex', flexDirection: 'column', gap: '0px',
};

const chevron: CSSProperties = {
  fontSize: '12px', color: 'var(--text-muted)', transition: 'transform 0.2s ease',
  cursor: 'pointer', userSelect: 'none', marginLeft: '2px',
};

const headerStyle: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '10px',
  padding: '10px 14px', background: 'var(--bg-card)',
  borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)',
  flexWrap: 'wrap',
};

const nameStyle: CSSProperties = { fontSize: '13px', fontWeight: 700, flex: 1, letterSpacing: '-0.01em' };

const countStyle: CSSProperties = {
  fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', fontVariantNumeric: 'tabular-nums',
};

const syncBtn: CSSProperties = {
  background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
  padding: '3px 8px', fontSize: '10px', fontWeight: 600, cursor: 'pointer',
  color: 'var(--text-muted)', fontFamily: 'var(--font)', transition: 'all var(--transition)',
};

const syncInfo: CSSProperties = {
  width: '100%', fontSize: '9px', color: 'var(--text-muted)', marginTop: '-4px',
};

const listStyle: CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: '8px', flex: 1,
  overflowY: 'auto', paddingRight: '2px', paddingBottom: '20px',
};

const emptyStyle: CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  gap: '8px', flex: 1, padding: '40px 20px', color: 'var(--text-muted)', fontSize: '12px',
  textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-secondary)',
};

const emptyCircle: CSSProperties = {
  width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-card)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', opacity: 0.4,
};

function formatSyncTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function PlatformColumn({ name, icon, accentColor, count, children, syncButton, collapsed, onToggleCollapse }: PlatformColumnProps) {
  return (
    <div style={collapsed ? columnCollapsed : column}>
      <div
        style={{ ...headerStyle, cursor: onToggleCollapse ? 'pointer' : undefined }}
        onClick={onToggleCollapse}
      >
        {onToggleCollapse && (
          <span style={{ ...chevron, transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>
            ▼
          </span>
        )}
        {icon}
        <span style={nameStyle}>{name}</span>
        {syncButton && (
          <button
            style={{ ...syncBtn, opacity: syncButton.loading ? 0.5 : 1 }}
            onClick={(e) => { e.stopPropagation(); syncButton.onClick(); }}
            disabled={syncButton.loading}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = accentColor; e.currentTarget.style.color = accentColor; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            {syncButton.label}
          </button>
        )}
        <span style={{ ...countStyle, color: accentColor, background: accentColor + '15' }}>
          {count}
        </span>
        {!collapsed && syncButton?.lastSync && (
          <div style={syncInfo}>Sync: {formatSyncTime(syncButton.lastSync)}</div>
        )}
      </div>

      {!collapsed && (
        <div style={listStyle}>
          {count === 0 && !syncButton?.loading ? (
            <div style={emptyStyle}>
              <div style={emptyCircle}>{icon}</div>
              {syncButton ? 'Clique em Sincronizar para carregar' : 'Nenhuma publicacao'}
            </div>
          ) : (
            children
          )}
        </div>
      )}
    </div>
  );
}
