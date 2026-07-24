import { useEffect } from 'react';
import { useAudienceIntelStore } from '../../store/useAudienceIntelStore';

export function ExecutiveInsights() {
  const { insights, fetchInsights, loading } = useAudienceIntelStore();

  useEffect(() => {
    if (insights.length === 0) fetchInsights();
  }, []);

  if (loading && insights.length === 0) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Carregando...</div>;
  }

  const level1 = insights.filter((i: any) => i.level === 1);

  if (level1.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
        <p>Insights executivos ainda nao foram gerados.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>
        Insights Executivos
      </h2>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
        7 descobertas dos 11.050 comentarios analisados. Baseadas em dados, nao em intuicao.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {level1.map((insight: any, i: number) => (
          <div
            key={insight.id}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '24px 28px',
              borderLeft: '4px solid var(--accent-gold)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <span style={{
                fontSize: 28,
                fontWeight: 800,
                color: 'var(--accent-gold)',
                lineHeight: 1,
                flexShrink: 0,
                width: 36,
                textAlign: 'center',
              }}>
                {i + 1}
              </span>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10, lineHeight: 1.4 }}>
                  {insight.title}
                </h3>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
                  {insight.narrative}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
