import type { CSSProperties, ReactNode } from 'react';
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
  return (
    <div style={container}>
      <header style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Inteligência comercial
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Qualidade da ingestão e confiança dos fatos observados.
          </div>
        </div>
        {actions}
      </header>
      <DataQualityTab />
    </div>
  );
}
