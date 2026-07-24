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
const barBg: CSSProperties = {
  height: '8px', borderRadius: '4px', background: 'var(--border)', flex: 1,
};

const confidenceColor = (c: string) => {
  if (c === 'alta') return '#22c55e';
  if (c === 'media' || c === 'média') return '#f59e0b';
  return '#94a3b8';
};

const statusColor = (exists: string) => {
  if (exists === 'no') return '#ef4444';
  if (exists === 'partial') return '#f59e0b';
  return '#22c55e';
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

// Map display labels to search keywords that actually appear in comments
const searchKeywordMap: Record<string, string> = {
  'TDAH nos estudos/concursos': 'estudar',
  'TDAH infantil/filhos': 'filho',
  'TDAH no trabalho/carreira': 'trabalho',
  'Como buscar diagnóstico': 'diagnóstico',
  'TDAH × Ansiedade': 'ansiedade',
  'Medicação/tratamento': 'medicação',
  'Hiperfoco (aprofundamento)': 'hiperfoco',
  'TDAH em relacionamentos': 'relacionamento',
  'TDAH em mulheres/feminino': 'mulher',
  'TDAH × Autismo': 'autismo',
  'TDAH × Superdotação': 'superdotado',
  'TDAH × Depressão': 'depressão',
  'Teste/avaliação (MAPA)': 'teste',
  'Curso/programa completo': 'curso',
  'App/ferramenta digital': 'app',
  'Livro': 'livro',
};

function ExampleCards({ examples, keyword, onExplore }: { examples?: CommentExample[]; keyword: string; onExplore: (s: string) => void }) {
  if (!examples || examples.length === 0) return null;
  const searchTerm = searchKeywordMap[keyword] || keyword.split(/[\s\/×]+/)[0].toLowerCase();
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

export function DemandasTab({ data, onExplore }: Props) {
  const { contentDemands, productDemands } = data;
  const [expandedContent, setExpandedContent] = useState<number | null>(null);
  const [expandedProduct, setExpandedProduct] = useState<number | null>(null);
  const maxProductMentions = Math.max(...productDemands.map(d => d.mentions), 1);

  return (
    <div style={grid2}>
      {/* Content Demands */}
      <div style={sectionCard}>
        <div style={sectionHeader}>
          <span style={sectionTitle}>Demandas de Conteudo</span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font)' }}>{contentDemands.length} temas</span>
        </div>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={th}>Tema</th>
              <th style={{ ...th, textAlign: 'right' }}>Mencoes</th>
              <th style={th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {contentDemands.map((d, i) => (
              <tr key={i}>
                <td colSpan={3} style={{ padding: 0 }}>
                  <div
                    style={{ display: 'contents', cursor: d.examples?.length ? 'pointer' : 'default' }}
                    onClick={() => d.examples?.length && setExpandedContent(expandedContent === i ? null : i)}
                  >
                    <table style={{ ...tableStyle, tableLayout: 'fixed' }}>
                      <tbody>
                        <tr>
                          <td style={{ ...td, fontWeight: 600, fontSize: '12px' }}>{d.topic}</td>
                          <td style={{ ...td, textAlign: 'right', fontWeight: 700, width: '80px' }}>{d.mentions}</td>
                          <td style={{ ...td, width: '100px' }}>
                            <span style={badge(statusColor(d.exists))}>
                              {d.type}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  {expandedContent === i && (
                    <ExampleCards examples={d.examples} keyword={d.topic} onExplore={onExplore} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Product Demands */}
      <div style={sectionCard}>
        <div style={sectionHeader}>
          <span style={sectionTitle}>Demandas de Produto</span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font)' }}>
            {productDemands.reduce((s, d) => s + d.mentions, 0)} mencoes
          </span>
        </div>
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {productDemands.map((d, i) => (
            <div key={i}>
              <div
                style={{ cursor: d.examples?.length ? 'pointer' : 'default' }}
                onClick={() => d.examples?.length && setExpandedProduct(expandedProduct === i ? null : i)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font)' }}>{d.type}</span>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font)' }}>{d.mentions}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={barBg}>
                    <div style={{
                      height: '8px', borderRadius: '4px',
                      background: confidenceColor(d.confidence),
                      width: `${(d.mentions / maxProductMentions) * 100}%`,
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                  <span style={badge(confidenceColor(d.confidence))}>{d.confidence}</span>
                </div>
              </div>
              {expandedProduct === i && (
                <ExampleCards examples={d.examples} keyword={d.type} onExplore={onExplore} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
