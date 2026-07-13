import { useState, type CSSProperties, type ReactNode } from 'react';
import { CommercialOverview } from './CommercialOverview';
import { DataQualityTab } from './DataQualityTab';

const container: CSSProperties = {
  padding: '24px',
  paddingBottom: '60px',
  flex: 1,
  overflowY: 'auto',
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '18px',
};

export function CommercialIntelligenceView({ actions }: { actions?: ReactNode }) {
  const [tab, setTab] = useState<'overview' | 'quality'>('overview');
  return (
    <div style={container}>
      <header style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Inteligência comercial
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {tab === 'overview'
              ? 'O que vendeu, quanto entrou e quais produtos sustentaram o período.'
              : 'Qualidade da ingestão e confiança dos fatos observados.'}
          </div>
        </div>
        {actions}
      </header>
      <nav className="ci-main-tabs" aria-label="Áreas da inteligência comercial">
        <button type="button" className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}>
          Visão comercial
        </button>
        <button type="button" className={tab === 'quality' ? 'active' : ''} onClick={() => setTab('quality')}>
          Qualidade dos dados
        </button>
      </nav>
      {tab === 'overview' ? <CommercialOverview /> : <DataQualityTab />}
    </div>
  );
}
