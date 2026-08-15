import { useEffect, useCallback } from 'react';
import type { CSSProperties } from 'react';
import type { Production, ProductionStatus } from '../../types/content';
import { useProductionStore } from '../../store/useProductionStore';

const STATUS_CONFIG: Record<ProductionStatus, { label: string; color: string; icon: string }> = {
  idea: { label: 'Ideia', color: '#7C3AED', icon: '💡' },
  script: { label: 'Roteiro', color: '#1DA1F2', icon: '📝' },
  recording: { label: 'Gravação', color: '#FF6B35', icon: '🎙️' },
  editing: { label: 'Edição', color: '#F0BA3C', icon: '🎬' },
  ready: { label: 'Pronto', color: '#22A35B', icon: '✅' },
  published: { label: 'Publicado', color: '#666', icon: '🌐' },
};

const STATUS_ORDER: ProductionStatus[] = ['idea', 'script', 'recording', 'editing', 'ready', 'published'];

// --- Styles ---
const wrapper: CSSProperties = { flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' };
const headerSection: CSSProperties = { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' };
const pageTitle: CSSProperties = { fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font)', letterSpacing: '-0.02em' };
const pageSubtitle: CSSProperties = { fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' };

const addBtn: CSSProperties = {
  background: 'var(--accent-gold)', border: 'none', borderRadius: 'var(--radius)',
  color: '#fff', padding: '10px 20px', fontSize: '14px', fontWeight: 700,
  cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '6px',
};

const statusCountsRow: CSSProperties = { display: 'flex', gap: '8px', flexWrap: 'wrap' };

const statusCountBadge = (color: string, active: boolean): CSSProperties => ({
  padding: '6px 14px', borderRadius: 'var(--radius)', fontSize: '13px', fontFamily: 'var(--font)',
  fontWeight: active ? 700 : 500, cursor: 'pointer', border: `1px solid ${active ? color : 'var(--border)'}`,
  background: active ? `${color}15` : 'var(--bg-card)', color: active ? color : 'var(--text-muted)',
  display: 'flex', alignItems: 'center', gap: '6px', transition: 'all var(--transition)',
});

const filterRow: CSSProperties = { display: 'flex', gap: '10px', alignItems: 'center' };
const searchInput: CSSProperties = {
  flex: 1, minWidth: '200px', padding: '9px 14px', fontSize: '13px', fontFamily: 'var(--font-body)',
  background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
  color: 'var(--text-primary)', outline: 'none',
};

const cardsList: CSSProperties = { display: 'flex', flexDirection: 'column', gap: '8px' };

const card = (statusColor: string): CSSProperties => ({
  background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
  padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer',
  transition: 'all var(--transition)', borderLeft: `3px solid ${statusColor}`,
});

const cardTitle: CSSProperties = { fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font)', flex: 1 };
const cardMeta: CSSProperties = { fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', display: 'flex', gap: '12px' };
const cardDate: CSSProperties = { fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' };

const statusPill = (color: string): CSSProperties => ({
  fontSize: '11px', fontWeight: 700, color, background: `${color}15`,
  padding: '3px 10px', borderRadius: '12px', fontFamily: 'var(--font)', whiteSpace: 'nowrap',
});

const emptyState: CSSProperties = {
  textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)', fontSize: '15px', fontFamily: 'var(--font-body)',
};
const emptyTitle: CSSProperties = { fontSize: '18px', fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'var(--font)', marginBottom: '8px' };

interface Props {
  onSelect: (id: string) => void;
}

export function ProductionList({ onSelect }: Props) {
  const {
    productions, loading, statusFilter, searchQuery,
    setProductions, setLoading, setStatusFilter, setSearchQuery, addProduction,
  } = useProductionStore();

  const fetchProductions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/productions');
      const data = await res.json();
      if (data.ok) setProductions(data.productions);
    } catch { /* ignore */ }
    setLoading(false);
  }, [setProductions, setLoading]);

  useEffect(() => { fetchProductions(); }, [fetchProductions]);

  const handleCreate = async () => {
    try {
      const res = await fetch('/api/productions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Nova produção', status: 'idea' }),
      });
      const data = await res.json();
      if (data.ok) {
        addProduction(data.production);
        onSelect(data.production.id);
      }
    } catch { /* ignore */ }
  };

  // Filter & sort
  let filtered = productions;
  if (statusFilter !== 'all') filtered = filtered.filter((p) => p.status === statusFilter);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter((p) =>
      p.title.toLowerCase().includes(q) || p.tags.some((t) => t.toLowerCase().includes(q))
    );
  }
  filtered = [...filtered].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  // Status counts
  const counts: Record<string, number> = { all: productions.length };
  for (const s of STATUS_ORDER) counts[s] = productions.filter((p) => p.status === s).length;

  return (
    <div style={wrapper}>
      <div style={headerSection}>
        <div>
          <div style={pageTitle}>Produções</div>
          <div style={pageSubtitle}>Gerencie seus vídeos do roteiro à publicação</div>
        </div>
        <button style={addBtn} onClick={handleCreate}>+ Nova produção</button>
      </div>

      {/* Status counts */}
      <div style={statusCountsRow}>
        <div
          style={statusCountBadge('var(--text-secondary)', statusFilter === 'all')}
          onClick={() => setStatusFilter('all')}
        >
          Todas <strong>{counts.all}</strong>
        </div>
        {STATUS_ORDER.map((s) => {
          const cfg = STATUS_CONFIG[s];
          return counts[s] > 0 ? (
            <div key={s} style={statusCountBadge(cfg.color, statusFilter === s)} onClick={() => setStatusFilter(s)}>
              {cfg.icon} {cfg.label} <strong>{counts[s]}</strong>
            </div>
          ) : null;
        })}
      </div>

      {/* Search */}
      <div style={filterRow}>
        <input
          style={searchInput}
          placeholder="Buscar por título ou tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* List */}
      {loading ? (
        <div style={emptyState}>Carregando...</div>
      ) : filtered.length === 0 ? (
        <div style={emptyState}>
          <div style={emptyTitle}>{productions.length === 0 ? 'Nenhuma produção' : 'Nenhum resultado'}</div>
          {productions.length === 0 && <div>Clique em <strong>"+ Nova produção"</strong> para começar</div>}
        </div>
      ) : (
        <div style={cardsList}>
          {filtered.map((p) => {
            const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.idea;
            const blocksWithBroll = p.blocks.filter((b) => b.brollId).length;
            return (
              <div
                key={p.id}
                style={card(cfg.color)}
                onClick={() => onSelect(p.id)}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-gold)'; e.currentTarget.style.boxShadow = 'var(--shadow-gold)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{ flex: 1 }}>
                  <div style={cardTitle}>{p.title}</div>
                  <div style={cardMeta}>
                    {p.blocks.length > 0 && <span>{p.blocks.length} blocos</span>}
                    {blocksWithBroll > 0 && <span>🎬 {blocksWithBroll} b-rolls</span>}
                    {p.tags.length > 0 && <span>{p.tags.slice(0, 3).join(', ')}</span>}
                    {p.status === 'idea' && p.ideaNote && (
                      <span style={{ fontStyle: 'italic' }}>{p.ideaNote.slice(0, 60)}...</span>
                    )}
                  </div>
                </div>
                <span style={statusPill(cfg.color)}>{cfg.icon} {cfg.label}</span>
                <span style={cardDate}>{new Date(p.updatedAt).toLocaleDateString('pt-BR')}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
