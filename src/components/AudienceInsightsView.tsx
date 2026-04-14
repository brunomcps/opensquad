import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { useAudienceStore } from '../store/useAudienceStore';
import { OverviewTab } from './audience/OverviewTab';
import { DemandasTab } from './audience/DemandasTab';
import { DoresSegmentosTab } from './audience/DoresSegmentosTab';
import { RecomendacoesTab } from './audience/RecomendacoesTab';
import { ExplorarTab } from './audience/ExplorarTab';

type TabId = 'overview' | 'demandas' | 'dores' | 'recomendacoes' | 'explorar';

const container: CSSProperties = {
  padding: '24px', flex: 1, overflowY: 'auto',
  display: 'flex', flexDirection: 'column', gap: '20px',
};

const subTabRow: CSSProperties = { display: 'flex', gap: 6 };
const subTab: CSSProperties = {
  padding: '8px 18px', borderRadius: 'var(--radius)',
  border: '1px solid var(--border)', background: 'var(--bg-card)',
  color: 'var(--text-secondary)', fontFamily: 'var(--font)',
  fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'var(--transition)',
};
const subTabActive: CSSProperties = {
  background: 'var(--accent-gold)', color: '#fff', border: '1px solid var(--accent-gold)',
};

const emptyState: CSSProperties = {
  padding: '60px 24px', textAlign: 'center', fontSize: '15px',
  color: 'var(--text-muted)',
};

const tabs: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Visao Geral' },
  { id: 'demandas', label: 'Demandas' },
  { id: 'dores', label: 'Dores & Segmentos' },
  { id: 'recomendacoes', label: 'Recomendacoes' },
  { id: 'explorar', label: 'Explorar' },
];

export function AudienceInsightsView() {
  const { data, loading, fetch: fetchData } = useAudienceStore();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [exploreSearch, setExploreSearch] = useState('');

  useEffect(() => { if (!data) fetchData(); }, [data, fetchData]);

  const handleExplore = (search: string) => {
    setExploreSearch(search);
    setActiveTab('explorar');
  };

  if (loading) return <div style={emptyState}>Carregando insights...</div>;
  if (!data) return <div style={emptyState}>Nenhuma analise disponivel. Rode <code>/opensquad run yt-comments</code> para gerar.</div>;

  return (
    <div style={container}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
        <span style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font)' }}>
          Audience Insights
        </span>
        <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'var(--font)' }}>
          {data.meta.period} · {data.meta.videosAnalyzed} videos · Gerado em {data.meta.generatedAt}
        </span>
      </div>

      {/* Tab bar */}
      <div style={subTabRow}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            style={activeTab === tab.id ? { ...subTab, ...subTabActive } : subTab}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && <OverviewTab data={data} />}
      {activeTab === 'demandas' && <DemandasTab data={data} onExplore={handleExplore} />}
      {activeTab === 'dores' && <DoresSegmentosTab data={data} onExplore={handleExplore} />}
      {activeTab === 'recomendacoes' && <RecomendacoesTab data={data} onExplore={handleExplore} />}
      {activeTab === 'explorar' && <ExplorarTab initialSearch={exploreSearch} />}
    </div>
  );
}
