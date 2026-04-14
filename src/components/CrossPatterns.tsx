import { useState, useEffect, type CSSProperties } from 'react';

const container: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
};

const card: CSSProperties = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  padding: '20px',
  transition: 'all var(--transition)',
};

const cardHeader: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  marginBottom: '12px',
  cursor: 'pointer',
};

const cardEmoji: CSSProperties = {
  fontSize: '22px',
};

const cardTitle: CSSProperties = {
  fontSize: '15px',
  fontWeight: 800,
  color: 'var(--text-primary)',
  fontFamily: 'var(--font)',
  flex: 1,
};

const cardToggle: CSSProperties = {
  fontSize: '12px',
  color: 'var(--text-muted)',
};

const summary: CSSProperties = {
  fontSize: '13px',
  lineHeight: '1.6',
  color: 'var(--text-secondary)',
  fontFamily: 'var(--font-body)',
  marginBottom: '12px',
};

const insightBox: CSSProperties = {
  padding: '10px 14px',
  background: 'rgba(240, 186, 60, 0.08)',
  border: '1px solid rgba(240, 186, 60, 0.2)',
  borderRadius: '6px',
  fontSize: '13px',
  lineHeight: '1.5',
  color: 'var(--accent-gold-dark)',
  fontFamily: 'var(--font-body)',
  marginTop: '8px',
};

const itemRow: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  gap: '10px',
  padding: '6px 0',
  borderBottom: '1px solid var(--border)',
  fontSize: '13px',
  fontFamily: 'var(--font-body)',
};

const freq: CSSProperties = {
  fontSize: '12px',
  fontWeight: 700,
  color: 'var(--accent-gold-dark)',
  fontFamily: 'var(--font)',
  minWidth: '50px',
  fontVariantNumeric: 'tabular-nums',
};

const itemName: CSSProperties = {
  fontWeight: 600,
  color: 'var(--text-primary)',
};

const itemDesc: CSSProperties = {
  color: 'var(--text-muted)',
  fontSize: '12px',
};

const topInsightCard: CSSProperties = {
  ...card,
  background: 'linear-gradient(135deg, rgba(240, 186, 60, 0.06), rgba(240, 186, 60, 0.02))',
  borderColor: 'rgba(240, 186, 60, 0.3)',
};

const insightItem: CSSProperties = {
  display: 'flex',
  gap: '10px',
  padding: '8px 0',
  borderBottom: '1px solid var(--border)',
  fontSize: '13px',
  lineHeight: '1.5',
  fontFamily: 'var(--font-body)',
  color: 'var(--text-secondary)',
};

const insightNum: CSSProperties = {
  fontSize: '14px',
  fontWeight: 800,
  color: 'var(--accent-gold-dark)',
  fontFamily: 'var(--font)',
  minWidth: '24px',
};

interface PatternSection {
  emoji: string;
  title: string;
  key: string;
}

const SECTIONS: PatternSection[] = [
  { emoji: '🎣', title: 'Padrões de Hook', key: 'hookPatterns' },
  { emoji: '🏗️', title: 'Padrões de Estrutura', key: 'structurePatterns' },
  { emoji: '🎭', title: 'Dispositivos Retóricos', key: 'rhetoricalDevices' },
  { emoji: '🧩', title: 'Padrões de Metáfora', key: 'metaphorPatterns' },
  { emoji: '📢', title: 'Padrões de CTA', key: 'ctaPatterns' },
  { emoji: '🔚', title: 'Padrões de Fechamento', key: 'closingPatterns' },
  { emoji: '🗣️', title: 'Assinatura Linguística', key: 'languageSignature' },
  { emoji: '📖', title: 'Padrões Narrativos', key: 'narrativePatterns' },
];

function renderItems(data: any): JSX.Element | null {
  if (!data) return null;

  const lists = [
    data.elements,
    data.dominantStructures,
    data.topDevices,
    data.dominantFields,
    data.recurringMetaphors,
    data.types,
    data.dominantElements,
    data.topBordoes,
    data.authorTerms,
  ].find((l) => Array.isArray(l) && l.length > 0);

  if (!lists) return null;

  return (
    <div>
      {lists.map((item: any, i: number) => (
        <div key={i} style={itemRow}>
          <span style={freq}>{item.frequency || item.count || item.avgFrequency || item.avgPerVideo || item.videosAppearing || ''}</span>
          <div>
            <span style={itemName}>{item.name || item.type || item.device || item.field || item.metaphor || item.element || item.bordao || item.term || ''}</span>
            {(item.description || item.examples) && (
              <div style={itemDesc}>
                {item.description || ''}
                {item.examples && ` Ex: ${item.examples.slice(0, 2).join(', ')}`}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function CrossPatterns() {
  const [patterns, setPatterns] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['hookPatterns']));

  useEffect(() => {
    fetch('/api/fichas/patterns')
      .then((r) => r.json())
      .then((d) => { if (d.ok) setPatterns(d.patterns); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Carregando padrões...</div>;
  if (!patterns) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Análise de padrões não disponível. Rode o script de cross-patterns.</div>;

  const toggle = (key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div style={container}>
      {/* Top Insights */}
      {patterns.topInsights && (
        <div style={topInsightCard}>
          <div style={cardHeader}>
            <span style={cardEmoji}>💡</span>
            <span style={cardTitle}>Top Insights — {patterns.totalVideos} vídeos ({patterns.totalDuration})</span>
          </div>
          {patterns.topInsights.map((insight: string, i: number) => (
            <div key={i} style={insightItem}>
              <span style={insightNum}>{i + 1}</span>
              <span>{insight}</span>
            </div>
          ))}
        </div>
      )}

      {/* Pattern sections */}
      {SECTIONS.map(({ emoji, title, key }) => {
        const data = patterns[key];
        if (!data) return null;
        const isExpanded = expandedSections.has(key);

        return (
          <div key={key} style={card}>
            <div style={cardHeader} onClick={() => toggle(key)}>
              <span style={cardEmoji}>{emoji}</span>
              <span style={cardTitle}>{title}</span>
              <span style={cardToggle}>{isExpanded ? '▼' : '▶'}</span>
            </div>
            {isExpanded && (
              <>
                <div style={summary}>{data.summary}</div>
                {renderItems(data)}
                {(data.insight || data.signature || data.positioning || data.register || data.bridgeToNextVideo || data.pronounUsage || data.dominantNarrativeType || data.caseStudyUsage) && (
                  <div style={insightBox}>
                    {data.insight && <div>💡 {data.insight}</div>}
                    {data.signature && <div>🎯 Assinatura: {data.signature}</div>}
                    {data.positioning && <div>📍 Posicionamento: {data.positioning}</div>}
                    {data.register && <div>🗣️ Registro: {data.register}</div>}
                    {data.bridgeToNextVideo && <div>🔗 Bridge: {data.bridgeToNextVideo}</div>}
                    {data.pronounUsage && <div>👤 Pronomes: {data.pronounUsage}</div>}
                    {data.dominantNarrativeType && <div>📖 Tipo dominante: {data.dominantNarrativeType}</div>}
                    {data.caseStudyUsage && <div>🏥 Casos clínicos: {data.caseStudyUsage}</div>}
                    {data.personalStoryUsage && <div>🪞 Histórias pessoais: {data.personalStoryUsage}</div>}
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
