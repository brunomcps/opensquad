import { useEffect, useCallback } from 'react';
import type { CSSProperties } from 'react';
import type { BRoll, BRollSource } from '../types/content';
import { useBRollStore } from '../store/useBRollStore';
import type { BRollSortField } from '../store/useBRollStore';
import { BRollCard } from './BRollCard';
import { BRollDetail } from './BRollDetail';
import { BRollImportDialog } from './BRollImportDialog';

const SOURCE_OPTIONS: { value: BRollSource | 'all'; label: string }[] = [
  { value: 'all', label: 'Todas as fontes' },
  { value: 'veo', label: 'Veo' },
  { value: 'grok', label: 'Grok' },
  { value: 'pexels', label: 'Pexels' },
  { value: 'pixabay', label: 'Pixabay' },
  { value: 'filmed', label: 'Gravado' },
  { value: 'remotion', label: 'Remotion' },
  { value: 'other', label: 'Outro' },
];

const SORT_OPTIONS: { value: BRollSortField; label: string }[] = [
  { value: 'date', label: 'Data' },
  { value: 'duration', label: 'Duração' },
  { value: 'name', label: 'Nome' },
  { value: 'usage', label: 'Mais usado' },
];

// --- Styles ---
const wrapper: CSSProperties = {
  flex: 1, overflowY: 'auto', padding: '20px',
  display: 'flex', flexDirection: 'column', gap: '16px',
};

const headerSection: CSSProperties = {
  display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
  gap: '16px', flexWrap: 'wrap',
};

const pageTitle: CSSProperties = {
  fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)',
  fontFamily: 'var(--font)', letterSpacing: '-0.02em',
};

const pageSubtitle: CSSProperties = {
  fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px',
};

const addBtn: CSSProperties = {
  background: 'var(--accent-gold)', border: 'none', borderRadius: 'var(--radius)',
  color: '#fff', padding: '10px 20px', fontSize: '14px', fontWeight: 700,
  cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '6px',
};

const filterBar: CSSProperties = {
  display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap',
};

const searchInput: CSSProperties = {
  flex: 1, minWidth: '200px', padding: '9px 14px', fontSize: '13px',
  fontFamily: 'var(--font-body)', background: 'var(--bg-card)',
  border: '1px solid var(--border)', borderRadius: 'var(--radius)',
  color: 'var(--text-primary)', outline: 'none',
};

const selectFilter: CSSProperties = {
  padding: '9px 14px', fontSize: '13px', fontFamily: 'var(--font)',
  background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius)', color: 'var(--text-primary)',
  cursor: 'pointer', outline: 'none',
};

const statsRow: CSSProperties = {
  display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)',
};

const statBadge: CSSProperties = {
  background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
  padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '6px',
};

const statNumber: CSSProperties = { fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font)' };

const grid: CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px',
};

const emptyState: CSSProperties = {
  textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)',
  fontSize: '15px', fontFamily: 'var(--font-body)',
};

const emptyTitle: CSSProperties = {
  fontSize: '18px', fontWeight: 700, color: 'var(--text-secondary)',
  fontFamily: 'var(--font)', marginBottom: '8px',
};

function sortBRolls(brolls: BRoll[], field: BRollSortField, asc: boolean): BRoll[] {
  const sorted = [...brolls].sort((a, b) => {
    switch (field) {
      case 'date': return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'duration': return b.duration - a.duration;
      case 'name': return a.description.localeCompare(b.description);
      case 'usage': return b.usedIn.length - a.usedIn.length;
      default: return 0;
    }
  });
  return asc ? sorted.reverse() : sorted;
}

function filterBRolls(brolls: BRoll[], search: string, source: BRollSource | 'all', tag: string): BRoll[] {
  let result = brolls;
  if (source !== 'all') result = result.filter((b) => b.source === source);
  if (tag) {
    const t = tag.toLowerCase();
    result = result.filter((b) => b.tags.some((bt) => bt.toLowerCase().includes(t)));
  }
  if (search) {
    const q = search.toLowerCase();
    result = result.filter((b) =>
      b.description.toLowerCase().includes(q) ||
      b.tags.some((t) => t.toLowerCase().includes(q)) ||
      b.filename.toLowerCase().includes(q)
    );
  }
  return result;
}

export function BRollLibrary() {
  const {
    brolls, loading, searchQuery, sourceFilter, tagFilter, sortField, sortAsc,
    selectedBRollId, showImportDialog,
    setBRolls, setLoading, setSearchQuery, setSourceFilter, setTagFilter,
    setSortField, toggleSortOrder, setSelectedBRollId, setShowImportDialog,
  } = useBRollStore();

  const fetchBRolls = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/brolls');
      const data = await res.json();
      if (data.ok) setBRolls(data.brolls);
    } catch { /* ignore */ }
    setLoading(false);
  }, [setBRolls, setLoading]);

  useEffect(() => { fetchBRolls(); }, [fetchBRolls]);

  const filtered = filterBRolls(brolls, searchQuery, sourceFilter, tagFilter);
  const sorted = sortBRolls(filtered, sortField, sortAsc);
  const selectedBRoll = brolls.find((b) => b.id === selectedBRollId);

  const allTags = [...new Set(brolls.flatMap((b) => b.tags))].sort();
  const totalDuration = brolls.reduce((sum, b) => sum + b.duration, 0);
  const totalSize = brolls.reduce((sum, b) => sum + b.fileSize, 0);

  return (
    <div style={wrapper}>
      {/* Header */}
      <div style={headerSection}>
        <div>
          <div style={pageTitle}>B-Roll Library</div>
          <div style={pageSubtitle}>Gerencie todos os seus b-rolls em um só lugar</div>
        </div>
        <button style={addBtn} onClick={() => setShowImportDialog(true)}>
          + Importar B-Rolls
        </button>
      </div>

      {/* Stats */}
      <div style={statsRow}>
        <div style={statBadge}>
          <span style={statNumber}>{brolls.length}</span> b-rolls
        </div>
        <div style={statBadge}>
          <span style={statNumber}>{Math.round(totalDuration)}s</span> total
        </div>
        <div style={statBadge}>
          <span style={statNumber}>{(totalSize / 1_000_000).toFixed(0)} MB</span> armazenamento
        </div>
        <div style={statBadge}>
          <span style={statNumber}>{brolls.filter((b) => b.usedIn.length > 0).length}</span> em uso
        </div>
      </div>

      {/* Filters */}
      <div style={filterBar}>
        <input
          style={searchInput}
          placeholder="Buscar por descrição, tags ou arquivo..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <select
          style={selectFilter}
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value as BRollSource | 'all')}
        >
          {SOURCE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {allTags.length > 0 && (
          <select
            style={selectFilter}
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
          >
            <option value="">Todas as tags</option>
            {allTags.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        )}
        <select
          style={selectFilter}
          value={sortField}
          onChange={(e) => setSortField(e.target.value as BRollSortField)}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>Ordenar: {o.label}</option>
          ))}
        </select>
        <button
          style={{ ...selectFilter, cursor: 'pointer', fontWeight: 600, minWidth: '36px', textAlign: 'center' }}
          onClick={toggleSortOrder}
          title={sortAsc ? 'Crescente' : 'Decrescente'}
        >
          {sortAsc ? '↑' : '↓'}
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div style={emptyState}>Carregando...</div>
      ) : sorted.length === 0 ? (
        <div style={emptyState}>
          <div style={emptyTitle}>
            {brolls.length === 0 ? 'Nenhum b-roll na biblioteca' : 'Nenhum resultado para os filtros'}
          </div>
          {brolls.length === 0 && (
            <div>
              Clique em <strong>"+ Importar B-Rolls"</strong> para adicionar arquivos,
              escanear uma pasta ou importar do squad yt-broll.
            </div>
          )}
        </div>
      ) : (
        <div style={grid}>
          {sorted.map((broll) => (
            <BRollCard
              key={broll.id}
              broll={broll}
              onClick={() => setSelectedBRollId(broll.id)}
            />
          ))}
        </div>
      )}

      {/* Detail panel */}
      {selectedBRoll && (
        <BRollDetail
          broll={selectedBRoll}
          onClose={() => setSelectedBRollId(null)}
        />
      )}

      {/* Import dialog */}
      {showImportDialog && (
        <BRollImportDialog onClose={() => setShowImportDialog(false)} />
      )}
    </div>
  );
}
