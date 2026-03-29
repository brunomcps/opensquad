import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { AudienceInsights, CommentExample } from '../../store/useAudienceStore';

const grid2: CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' };

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
const tableStyle: CSSProperties = {
  width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: 'var(--font)',
};
const th: CSSProperties = {
  textAlign: 'left', padding: '10px 16px', fontSize: '11px', fontWeight: 700,
  color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em',
  borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)',
};
const td: CSSProperties = {
  padding: '10px 16px', borderBottom: '1px solid var(--border)', color: 'var(--text-primary)',
};
const badge = (bg: string): CSSProperties => ({
  display: 'inline-block', padding: '2px 8px', borderRadius: '10px',
  fontSize: '11px', fontWeight: 700, background: bg, color: '#fff',
});

const urgencyColor = (u: string) => {
  if (u === 'critica') return '#ef4444';
  if (u === 'alta') return '#f59e0b';
  return '#94a3b8';
};

const commentCard: CSSProperties = {
  padding: '10px 16px', background: 'var(--bg-secondary)',
  borderRadius: 'var(--radius)', margin: '4px 0',
  fontSize: '12px', fontFamily: 'var(--font)',
};
const commentText: CSSProperties = {
  color: 'var(--text-primary)', lineHeight: 1.4,
};
const commentMeta: CSSProperties = {
  fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px',
};
const likesBadge: CSSProperties = {
  display: 'inline-block', padding: '1px 6px', borderRadius: '8px',
  fontSize: '10px', fontWeight: 700, background: 'var(--border)',
  color: 'var(--text-primary)', marginRight: '6px',
};
const exploreLink: CSSProperties = {
  fontSize: '11px', color: 'var(--accent-gold)', cursor: 'pointer',
  fontWeight: 600, fontFamily: 'var(--font)', border: 'none',
  background: 'none', padding: 0, marginTop: '4px',
};

const searchKeywordMap: Record<string, string> = {
  'Paralisia / não consigo funcionar': 'não consigo',
  'Luta diária genérica': 'difícil',
  'Sofrimento geral': 'sofro',
  'Frustração com potencial': 'frustração',
  'Ansiedade + TDAH': 'ansiedade',
  'Depressão (comorbidade)': 'depressão',
  'Desespero (nível extremo)': 'desespero',
  'Pré-diagnóstico': 'será que tenho',
  'Cuidadores/parceiros': 'meu filho',
  'Recém-diagnosticados': 'fui diagnosticado',
  'Profissionais': 'psicólogo',
  'Diagnóstico tardio 50+': 'diagnóstico tardio',
};

function ExampleCards({ examples, keyword, onExplore }: { examples?: CommentExample[]; keyword: string; onExplore: (s: string) => void }) {
  if (!examples || examples.length === 0) return null;
  const searchTerm = searchKeywordMap[keyword] || keyword.split(/[\s\/]+/)[0].toLowerCase();
  return (
    <div style={{ padding: '8px 16px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {examples.map((ex, i) => (
        <div key={i} style={commentCard}>
          <div style={commentText}>
            <span style={likesBadge}>{ex.likes}</span>
            "{ex.content.length > 200 ? ex.content.slice(0, 200) + '...' : ex.content}"
          </div>
          <div style={commentMeta}>@{ex.author} · {ex.video}</div>
        </div>
      ))}
      <button style={exploreLink} onClick={() => onExplore(searchTerm)}>
        Ver no Explorar →
      </button>
    </div>
  );
}

interface Props {
  data: AudienceInsights;
  onExplore: (search: string) => void;
}

export function DoresSegmentosTab({ data, onExplore }: Props) {
  const { gapMap, painPoints, audienceSegments } = data;
  const [expandedPain, setExpandedPain] = useState<number | null>(null);
  const [expandedSegment, setExpandedSegment] = useState<number | null>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Gap Map - full width */}
      <div style={sectionCard}>
        <div style={sectionHeader}>
          <span style={sectionTitle}>Mapa de Dores x Oportunidades</span>
        </div>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={th}>Dor</th>
              <th style={{ ...th, textAlign: 'right' }}>Freq</th>
              <th style={th}>Produto Atual</th>
              <th style={th}>Oportunidade</th>
            </tr>
          </thead>
          <tbody>
            {gapMap.map((g, i) => (
              <tr key={i}>
                <td style={{ ...td, fontWeight: 600 }}>{g.pain}</td>
                <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{g.freq}</td>
                <td style={td}>
                  {g.currentProduct
                    ? <span style={{ fontSize: '12px', color: '#22c55e', fontFamily: 'var(--font)' }}>{g.currentProduct}</span>
                    : <span style={badge('#ef4444')}>GAP</span>
                  }
                </td>
                <td style={{ ...td, fontSize: '12px' }}>{g.opportunity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Two columns: Pain Points + Segments */}
      <div style={grid2}>
        {/* Pain Points */}
        <div style={sectionCard}>
          <div style={sectionHeader}>
            <span style={sectionTitle}>Sinais de Dor</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font)' }}>
              {painPoints.reduce((s, p) => s + p.frequency, 0)} sinais
            </span>
          </div>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={th}>Dor</th>
                <th style={{ ...th, textAlign: 'right' }}>Freq</th>
                <th style={th}>Urgencia</th>
              </tr>
            </thead>
            <tbody>
              {painPoints.map((p, i) => (
                <tr key={i}>
                  <td colSpan={3} style={{ padding: 0 }}>
                    <div
                      style={{ cursor: p.examples?.length ? 'pointer' : 'default' }}
                      onClick={() => p.examples?.length && setExpandedPain(expandedPain === i ? null : i)}
                    >
                      <table style={{ ...tableStyle, tableLayout: 'fixed' }}>
                        <tbody>
                          <tr>
                            <td style={{ ...td, fontSize: '12px', fontWeight: 600 }}>{p.pain}</td>
                            <td style={{ ...td, textAlign: 'right', fontWeight: 700, width: '60px' }}>{p.frequency}+</td>
                            <td style={{ ...td, width: '80px' }}>
                              <span style={badge(urgencyColor(p.urgency))}>{p.urgency}</span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    {expandedPain === i && (
                      <ExampleCards examples={p.examples} keyword={p.pain} onExplore={onExplore} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Audience Segments */}
        <div style={sectionCard}>
          <div style={sectionHeader}>
            <span style={sectionTitle}>Segmentos de Audiencia</span>
          </div>
          <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {audienceSegments.map((s, i) => (
              <div key={i}>
                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0',
                    borderBottom: i < audienceSegments.length - 1 ? '1px solid var(--border)' : 'none',
                    cursor: s.examples?.length ? 'pointer' : 'default',
                  }}
                  onClick={() => s.examples?.length && setExpandedSegment(expandedSegment === i ? null : i)}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font)' }}>
                      {s.segment}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font)' }}>
                      {s.description} · {s.need}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font)', marginTop: '2px' }}>
                      Funil: {s.funnel}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font)' }}>{s.size}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font)' }}>{s.pct}%</div>
                  </div>
                </div>
                {expandedSegment === i && (
                  <ExampleCards examples={s.examples} keyword={s.segment} onExplore={onExplore} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
