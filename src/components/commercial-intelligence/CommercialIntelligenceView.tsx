import type { CSSProperties } from 'react';
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

export function CommercialIntelligenceView() {
  return (
    <div style={container}>
      <header>
        <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Inteligência comercial
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Qualidade da ingestão e confiança dos fatos observados.
        </div>
      </header>
      <DataQualityTab />
    </div>
  );
}
