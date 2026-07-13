import { useState, type CSSProperties, type ReactNode } from 'react';
import { CampaignTracking } from '../../src/components/commercial-intelligence/CampaignTracking';
import { CommercialOverview } from '../../src/components/commercial-intelligence/CommercialOverview';
import { DataQualityTab } from '../../src/components/commercial-intelligence/DataQualityTab';
import { VideoSalesAssociation } from '../../src/components/commercial-intelligence/VideoSalesAssociation';
import type { MemberRole } from './api';

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

type Tab = 'overview' | 'tracking' | 'association' | 'quality';

const TAB_COPY: Record<Tab, string> = {
  overview: 'O que vendeu, quanto entrou e quais produtos sustentaram o período.',
  tracking: 'Quais campanhas possuem origem comprovada, clique e venda atribuída.',
  association: 'Quais vídeos foram seguidos por mudança nas vendas, sem fingir causalidade.',
  quality: 'Qualidade da ingestão e confiança dos fatos observados.',
};

export function StandaloneCommercialIntelligenceView({ actions, role }: { actions?: ReactNode; role: MemberRole }) {
  const [tab, setTab] = useState<Tab>('overview');
  return (
    <div style={container}>
      <header style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Inteligência comercial
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>{TAB_COPY[tab]}</div>
        </div>
        {actions}
      </header>
      <nav className="ci-main-tabs" aria-label="Áreas da inteligência comercial">
        <button type="button" className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}>Visão comercial</button>
        <button type="button" className={tab === 'tracking' ? 'active' : ''} onClick={() => setTab('tracking')}>Rastreamento</button>
        <button type="button" className={tab === 'association' ? 'active' : ''} onClick={() => setTab('association')}>Vídeos × vendas</button>
        <button type="button" className={tab === 'quality' ? 'active' : ''} onClick={() => setTab('quality')}>Qualidade dos dados</button>
      </nav>
      {tab === 'overview' && <CommercialOverview />}
      {tab === 'tracking' && <CampaignTracking role={role} />}
      {tab === 'association' && <VideoSalesAssociation />}
      {tab === 'quality' && <DataQualityTab />}
    </div>
  );
}
