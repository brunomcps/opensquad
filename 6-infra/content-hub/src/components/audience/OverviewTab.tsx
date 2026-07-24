import type { CSSProperties } from 'react';
import type { AudienceInsights } from '../../store/useAudienceStore';

const grid5: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px' };
const grid2: CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' };

const kpiCard: CSSProperties = {
  background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)', padding: '20px 24px',
  display: 'flex', flexDirection: 'column', gap: '4px', boxShadow: 'var(--shadow-sm)',
};
const kpiLabel: CSSProperties = {
  fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font)',
};
const kpiValue: CSSProperties = {
  fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)',
  lineHeight: 1.1, fontFamily: 'var(--font)', letterSpacing: '-0.02em',
};
const kpiSub: CSSProperties = { fontSize: '12px', color: 'var(--text-secondary)' };

const sectionCard: CSSProperties = {
  background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)',
  display: 'flex', flexDirection: 'column', overflow: 'hidden',
};
const sectionHeader: CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '14px 20px', borderBottom: '1px solid var(--border)',
};
const sectionTitle: CSSProperties = {
  fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font)',
};

const barBg: CSSProperties = {
  height: '8px', borderRadius: '4px', background: 'var(--border)', flex: 1,
};

const highlightRow: CSSProperties = {
  padding: '12px 20px', borderBottom: '1px solid var(--border)',
  display: 'flex', alignItems: 'center', gap: '12px',
};
const highlightIcon: CSSProperties = {
  width: '32px', height: '32px', borderRadius: '8px',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: '14px', fontWeight: 800, color: '#fff', flexShrink: 0,
};
const highlightText: CSSProperties = {
  fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font)',
};
const highlightSub: CSSProperties = {
  fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font)',
};

interface Props {
  data: AudienceInsights;
}

export function OverviewTab({ data }: Props) {
  const { kpis, contentDemands, productDemands, gapMap, categoryDistribution } = data;
  const maxCatCount = Math.max(...categoryDistribution.map(c => c.count));

  const topContent = contentDemands.length > 0
    ? contentDemands.reduce((a, b) => a.mentions > b.mentions ? a : b)
    : null;
  const topProduct = productDemands.length > 0
    ? productDemands.reduce((a, b) => a.mentions > b.mentions ? a : b)
    : null;
  const biggestGap = gapMap
    .filter(g => g.gap)
    .sort((a, b) => b.freq - a.freq)[0] || null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* KPIs */}
      <div style={grid5}>
        <div style={kpiCard}>
          <span style={kpiLabel}>Comentarios</span>
          <span style={kpiValue}>{kpis.audienceComments.toLocaleString('pt-BR')}</span>
          <span style={kpiSub}>audiencia (de {kpis.totalComments.toLocaleString('pt-BR')} total)</span>
        </div>
        <div style={kpiCard}>
          <span style={kpiLabel}>Demandas Conteudo</span>
          <span style={{ ...kpiValue, color: '#3b82f6' }}>{kpis.contentDemands}</span>
          <span style={kpiSub}>pedidos de temas</span>
        </div>
        <div style={kpiCard}>
          <span style={kpiLabel}>Demandas Produto</span>
          <span style={{ ...kpiValue, color: '#22c55e' }}>{kpis.productDemands}</span>
          <span style={kpiSub}>sinais de compra</span>
        </div>
        <div style={kpiCard}>
          <span style={kpiLabel}>Sinais de Dor</span>
          <span style={{ ...kpiValue, color: '#ef4444' }}>{kpis.painSignals}</span>
          <span style={kpiSub}>frustracoes detectadas</span>
        </div>
        <div style={kpiCard}>
          <span style={kpiLabel}>PMF Score</span>
          <span style={{ ...kpiValue, color: 'var(--accent-gold-dark)' }}>{kpis.pmfScore}</span>
          <span style={kpiSub}>L3-L5 (benchmark: 40%)</span>
        </div>
      </div>

      {/* Two-column: Destaques + Category Distribution */}
      <div style={grid2}>
        {/* Destaques */}
        <div style={sectionCard}>
          <div style={sectionHeader}>
            <span style={sectionTitle}>Destaques</span>
          </div>
          {topContent && (
            <div style={highlightRow}>
              <div style={{ ...highlightIcon, background: '#3b82f6' }}>C</div>
              <div>
                <div style={highlightText}>{topContent.topic}</div>
                <div style={highlightSub}>{topContent.mentions} mencoes - principal demanda de conteudo</div>
              </div>
            </div>
          )}
          {topProduct && (
            <div style={highlightRow}>
              <div style={{ ...highlightIcon, background: '#22c55e' }}>P</div>
              <div>
                <div style={highlightText}>{topProduct.type}</div>
                <div style={highlightSub}>{topProduct.mentions} mencoes - principal demanda de produto</div>
              </div>
            </div>
          )}
          {biggestGap && (
            <div style={{ ...highlightRow, borderBottom: 'none' }}>
              <div style={{ ...highlightIcon, background: '#ef4444' }}>G</div>
              <div>
                <div style={highlightText}>{biggestGap.pain}</div>
                <div style={highlightSub}>Freq {biggestGap.freq} - maior gap sem produto atual</div>
              </div>
            </div>
          )}
          {!topContent && !topProduct && !biggestGap && (
            <div style={{ padding: '20px', fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'var(--font)' }}>
              Nenhum destaque disponivel.
            </div>
          )}
        </div>

        {/* Category Distribution */}
        <div style={sectionCard}>
          <div style={sectionHeader}>
            <span style={sectionTitle}>Distribuicao por Categoria</span>
          </div>
          <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {categoryDistribution.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  fontSize: '11px', color: 'var(--text-muted)', width: '140px',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0,
                  fontFamily: 'var(--font)',
                }}>
                  {c.category.replace(/_/g, ' ')}
                </span>
                <div style={{ ...barBg, height: '6px' }}>
                  <div style={{
                    height: '6px', borderRadius: '3px',
                    background: 'var(--accent-gold)',
                    width: `${(c.count / maxCatCount) * 100}%`,
                  }} />
                </div>
                <span style={{
                  fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)',
                  width: '45px', textAlign: 'right', flexShrink: 0, fontFamily: 'var(--font)',
                }}>
                  {c.count.toLocaleString('pt-BR')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
