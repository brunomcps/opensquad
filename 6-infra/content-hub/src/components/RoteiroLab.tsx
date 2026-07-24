import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useFichaStore } from '../store/useFichaStore';
import { FichaCard } from './FichaCard';
import { CrossPatterns } from './CrossPatterns';
import { PerformanceAnalysis } from './PerformanceAnalysis';
import type { FichaFull } from '../types/content';

type TabMode = 'fichas' | 'patterns' | 'performance';

const container: CSSProperties = {
  padding: '24px',
  maxWidth: '1400px',
  margin: '0 auto',
  height: 'calc(100vh - 56px)',
  overflowY: 'auto',
};

const headerRow: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '20px',
};

const pageTitle: CSSProperties = {
  fontSize: '22px',
  fontWeight: 800,
  color: 'var(--text-primary)',
  fontFamily: 'var(--font)',
};

const subtitle: CSSProperties = {
  fontSize: '13px',
  color: 'var(--text-muted)',
  fontFamily: 'var(--font-body)',
  marginTop: '4px',
};

const searchInput: CSSProperties = {
  padding: '8px 14px',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  background: 'var(--bg-secondary)',
  color: 'var(--text-primary)',
  fontSize: '13px',
  fontFamily: 'var(--font-body)',
  width: '300px',
  outline: 'none',
};

const statsBar: CSSProperties = {
  display: 'flex',
  gap: '16px',
  marginBottom: '20px',
  flexWrap: 'wrap',
};

const statBadge: CSSProperties = {
  padding: '10px 16px',
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  fontSize: '12px',
  fontFamily: 'var(--font-body)',
  color: 'var(--text-secondary)',
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
};

const statValue: CSSProperties = {
  fontSize: '18px',
  fontWeight: 800,
  color: 'var(--accent-gold-dark)',
  fontFamily: 'var(--font)',
  fontVariantNumeric: 'tabular-nums',
};

const grid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
  gap: '16px',
};

const emptyState: CSSProperties = {
  textAlign: 'center',
  padding: '60px 24px',
  color: 'var(--text-muted)',
  fontSize: '14px',
  fontFamily: 'var(--font-body)',
};

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const tabBtn: CSSProperties = {
  padding: '8px 20px',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  background: 'var(--bg-secondary)',
  color: 'var(--text-muted)',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'var(--font)',
  transition: 'all var(--transition)',
};

const tabBtnActive: CSSProperties = {
  ...tabBtn,
  borderColor: 'var(--accent-gold)',
  color: 'var(--accent-gold-dark)',
  fontWeight: 700,
  boxShadow: 'var(--shadow-gold)',
};

export function RoteiroLab() {
  const fichas = useFichaStore((s) => s.fichas);
  const stats = useFichaStore((s) => s.stats);
  const loading = useFichaStore((s) => s.loading);
  const searchQuery = useFichaStore((s) => s.searchQuery);
  const setFichas = useFichaStore((s) => s.setFichas);
  const setStats = useFichaStore((s) => s.setStats);
  const setLoading = useFichaStore((s) => s.setLoading);
  const setSearchQuery = useFichaStore((s) => s.setSearchQuery);
  const setSelectedFicha = useFichaStore((s) => s.setSelectedFicha);
  const [tab, setTab] = useState<TabMode>('fichas');

  const fetchData = useCallback(async (search?: string) => {
    setLoading(true);
    try {
      const searchParam = search ? `?search=${encodeURIComponent(search)}` : '';
      const [fichasRes, statsRes] = await Promise.all([
        fetch(`/api/fichas${searchParam}`),
        fetch('/api/fichas/stats/summary'),
      ]);
      const fichasData = await fichasRes.json();
      const statsData = await statsRes.json();
      if (fichasData.ok) setFichas(fichasData.fichas);
      if (statsData.ok) setStats(statsData.stats);
    } catch (e) {
      console.error('Failed to fetch fichas:', e);
    } finally {
      setLoading(false);
    }
  }, [setFichas, setStats, setLoading]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Debounced search — fetch from API for full-text search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData(searchQuery || undefined);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, fetchData]);

  const filtered = fichas;

  const handleCardClick = async (videoId: string) => {
    try {
      const res = await fetch(`/api/fichas/${videoId}`);
      const data = await res.json();
      if (data.ok) setSelectedFicha(data.ficha as FichaFull);
    } catch (e) {
      console.error('Failed to fetch ficha detail:', e);
    }
  };

  return (
    <div style={container}>
      <div style={headerRow}>
        <div>
          <div style={pageTitle}>Roteiro Lab</div>
          <div style={subtitle}>
            {loading ? 'Carregando...' : `${fichas.length} fichas de roteiro analisadas`}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button style={tab === 'fichas' ? tabBtnActive : tabBtn} onClick={() => setTab('fichas')}>
              📝 Fichas
            </button>
            <button style={tab === 'patterns' ? tabBtnActive : tabBtn} onClick={() => setTab('patterns')}>
              🔬 Padrões do Canal
            </button>
            <button style={tab === 'performance' ? tabBtnActive : tabBtn} onClick={() => setTab('performance')}>
              📊 Performance
            </button>
          </div>
          {tab === 'fichas' && (
            <input
              style={searchInput}
              type="text"
              placeholder="Buscar por título..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-gold)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
            />
          )}
        </div>
      </div>

      {tab === 'fichas' && (
        <>
          {stats && (
            <div style={statsBar}>
              <div style={statBadge}>
                <span>Fichas</span>
                <span style={statValue}>{stats.totalFichas}</span>
              </div>
              <div style={statBadge}>
                <span>Duração média</span>
                <span style={statValue}>{formatDuration(stats.avgDurationSeconds)}</span>
              </div>
              <div style={statBadge}>
                <span>Total horas analisadas</span>
                <span style={statValue}>{(stats.avgDurationSeconds * stats.totalFichas / 3600).toFixed(1)}h</span>
              </div>
            </div>
          )}

          {filtered.length === 0 && !loading ? (
            <div style={emptyState}>
              {searchQuery ? 'Nenhuma ficha encontrada para essa busca.' : 'Nenhuma ficha disponível.'}
            </div>
          ) : (
            <div style={grid}>
              {filtered.map((ficha) => (
                <FichaCard
                  key={ficha.videoId}
                  ficha={ficha}
                  onClick={() => handleCardClick(ficha.videoId)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'patterns' && <CrossPatterns />}

      {tab === 'performance' && <PerformanceAnalysis />}
    </div>
  );
}
