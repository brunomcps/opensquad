import { useState, useEffect, useMemo } from 'react';
import type { CSSProperties } from 'react';
import type { BRoll } from '../../types/content';

/* ── Styles ─────────────────────────────────────────── */

const backdrop: CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const dialog: CSSProperties = {
  position: 'relative',
  background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)',
  padding: '28px', width: '640px', maxHeight: '80vh',
  boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  display: 'flex', flexDirection: 'column', gap: '16px',
};

const headerRow: CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
};

const titleStyle: CSSProperties = {
  fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font)',
};

const closeBtn: CSSProperties = {
  background: 'transparent', border: 'none', cursor: 'pointer',
  color: 'var(--text-muted)', fontSize: '20px', lineHeight: 1,
  padding: '4px 8px', borderRadius: 'var(--radius)',
};

const searchInput: CSSProperties = {
  width: '100%', padding: '10px 14px', fontSize: '14px', fontFamily: 'var(--font-body)',
  background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
  color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box',
};

const grid: CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px',
  overflowY: 'auto', flex: 1, minHeight: 0, paddingRight: '4px',
};

const card: CSSProperties = {
  background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius)', overflow: 'hidden', cursor: 'pointer',
  transition: 'border-color 0.15s, box-shadow 0.15s',
  boxShadow: 'var(--shadow-sm)',
};

const thumbWrap: CSSProperties = {
  position: 'relative', width: '100%', aspectRatio: '16/9',
  background: '#000', overflow: 'hidden',
};

const thumbImg: CSSProperties = {
  width: '100%', height: '100%', objectFit: 'cover', display: 'block',
};

const durationBadge: CSSProperties = {
  position: 'absolute', bottom: '4px', right: '4px',
  background: 'rgba(0,0,0,0.75)', color: '#fff',
  fontSize: '10px', fontWeight: 700, padding: '2px 5px',
  borderRadius: '3px', fontFamily: 'var(--font)', fontVariantNumeric: 'tabular-nums',
};

const cardInfo: CSSProperties = {
  padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '4px',
};

const descStyle: CSSProperties = {
  fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font)',
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
};

const tagsRow: CSSProperties = {
  display: 'flex', flexWrap: 'wrap', gap: '3px',
};

const tagChip: CSSProperties = {
  fontSize: '9px', background: 'var(--bg-primary)', color: 'var(--text-secondary)',
  padding: '1px 5px', borderRadius: '3px', fontFamily: 'var(--font-body)',
};

const emptyState: CSSProperties = {
  textAlign: 'center', padding: '40px 20px',
  color: 'var(--text-muted)', fontSize: '14px', fontFamily: 'var(--font-body)',
};

const loadingState: CSSProperties = {
  textAlign: 'center', padding: '40px 20px',
  color: 'var(--text-muted)', fontSize: '14px', fontFamily: 'var(--font-body)',
};

/* ── Helpers ────────────────────────────────────────── */

function formatDuration(seconds: number): string {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`;
}

/* ── Component ──────────────────────────────────────── */

interface BRollPickerProps {
  onSelect: (brollId: string) => void;
  onClose: () => void;
}

export function BRollPicker({ onSelect, onClose }: BRollPickerProps) {
  const [brolls, setBrolls] = useState<BRoll[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/brolls')
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setBrolls(Array.isArray(data) ? data : data.brolls ?? []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return brolls;
    const q = search.toLowerCase();
    return brolls.filter(
      (b) =>
        b.description.toLowerCase().includes(q) ||
        b.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [brolls, search]);

  const handleSelect = (id: string) => {
    onSelect(id);
    onClose();
  };

  return (
    <div style={backdrop} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={dialog}>
        {/* Header */}
        <div style={headerRow}>
          <span style={titleStyle}>Selecionar B-Roll</span>
          <button
            style={closeBtn}
            onClick={onClose}
            onMouseEnter={(e) => { (e.currentTarget.style as any).color = 'var(--text-primary)'; }}
            onMouseLeave={(e) => { (e.currentTarget.style as any).color = 'var(--text-muted)'; }}
            aria-label="Fechar"
          >
            &#x2715;
          </button>
        </div>

        {/* Search */}
        <input
          style={searchInput}
          type="text"
          placeholder="Buscar por descricao ou tag..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />

        {/* Content */}
        {loading ? (
          <div style={loadingState}>Carregando b-rolls...</div>
        ) : filtered.length === 0 ? (
          <div style={emptyState}>
            {search ? 'Nenhum b-roll encontrado para essa busca.' : 'Nenhum b-roll na biblioteca.'}
          </div>
        ) : (
          <div style={grid}>
            {filtered.map((b) => {
              const isHovered = hoveredId === b.id;
              return (
                <div
                  key={b.id}
                  style={{
                    ...card,
                    borderColor: isHovered ? 'var(--accent-gold)' : 'var(--border)',
                    boxShadow: isHovered ? '0 0 0 1px var(--accent-gold)' : 'var(--shadow-sm)',
                  }}
                  onClick={() => handleSelect(b.id)}
                  onMouseEnter={() => setHoveredId(b.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <div style={thumbWrap}>
                    <img
                      src={`/api/brolls/thumbnail/${b.id}`}
                      alt={b.description}
                      style={thumbImg}
                      loading="lazy"
                    />
                    {b.duration > 0 && (
                      <span style={durationBadge}>{formatDuration(b.duration)}</span>
                    )}
                  </div>
                  <div style={cardInfo}>
                    <div style={descStyle}>{b.description || b.filename}</div>
                    {b.tags.length > 0 && (
                      <div style={tagsRow}>
                        {b.tags.slice(0, 3).map((t) => (
                          <span key={t} style={tagChip}>{t}</span>
                        ))}
                        {b.tags.length > 3 && (
                          <span style={tagChip}>+{b.tags.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
