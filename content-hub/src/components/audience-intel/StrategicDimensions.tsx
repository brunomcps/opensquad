import { useAudienceIntelStore } from '../../store/useAudienceIntelStore';

const ICONS: Record<string, string> = {
  demandas: '\u{1F4CA}',
  conteudo: '\u{1F3AC}',
  produto: '\u{1F4B0}',
  copy: '\u{270D}\u{FE0F}',
  metodo: '\u{1F9EA}',
  perfil: '\u{1F464}',
  tipo_sentimento: '\u{1F3AD}',
  prova_social: '\u{1F31F}',
  videos: '\u{1F3A5}',
  sintomas: '\u{1FA7A}',
};

export function StrategicDimensions() {
  const { dimensionCards, loading, drillDown, fetchDimensionDetail, fetchComments, fetchSuperfans } = useAudienceIntelStore();

  const handleClick = (key: string, label: string) => {
    if (key === 'perfil') {
      drillDown(3, label, key);
      fetchDimensionDetail(key);
    } else if (key === 'videos') {
      drillDown(3, label, key);
      fetchDimensionDetail(key);
    } else if (key === 'demandas') {
      drillDown(3, label, key);
      fetchDimensionDetail(key);
    } else if (key === 'tipo_sentimento') {
      drillDown(3, label, key);
      fetchDimensionDetail(key);
    } else if (key === 'prova_social') {
      drillDown(3, label, key);
      fetchDimensionDetail(key);
    } else if (key === 'metodo') {
      drillDown(4, label, key, 'metodo_testado');
    } else if (key === 'sintomas') {
      drillDown(3, label, key);
    } else if (key === 'conteudo' || key === 'produto' || key === 'copy') {
      drillDown(4, label, key, `sinal_${key}`);
    } else {
      drillDown(3, label, key);
      fetchDimensionDetail(key);
    }
  };

  if (loading && dimensionCards.length === 0) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Carregando...</div>;
  }

  const handleInsights = () => {
    drillDown(1, 'Insights Executivos');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
          Audience Intelligence
        </h2>
        <button
          onClick={handleInsights}
          style={{
            background: 'var(--accent-gold)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '8px 16px',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          7 Insights Executivos
        </button>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 16,
      }}>
        {dimensionCards.map(card => (
          <button
            key={card.key}
            onClick={() => handleClick(card.key, card.label)}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '20px 24px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--accent-gold)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(240,186,60,0.15)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 24 }}>{ICONS[card.key] || ''}</span>
              <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{card.label}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--accent-gold-dark)', marginBottom: 4 }}>
              {card.metric.toLocaleString()}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
              {card.subtitle}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
              {card.detail}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
