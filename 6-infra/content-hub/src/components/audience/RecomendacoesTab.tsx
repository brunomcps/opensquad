import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { AudienceInsights, CommentExample } from '../../store/useAudienceStore';

const badge = (bg: string): CSSProperties => ({
  display: 'inline-block', padding: '2px 8px', borderRadius: '10px',
  fontSize: '11px', fontWeight: 700, background: bg, color: '#fff',
});

const priorityColor = (p: string) => {
  if (p === 'maxima' || p === 'máxima') return '#ef4444';
  if (p === 'alta') return '#f59e0b';
  if (p.includes('media') || p.includes('média')) return '#3b82f6';
  return '#94a3b8';
};

const effortColor = (e: string) => {
  if (e === 'baixo') return '#22c55e';
  if (e === 'medio' || e === 'médio') return '#f59e0b';
  return '#ef4444';
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
  'Criar curso "Estratégias TDAH Adulto"': 'curso',
  'Reforçar CTA do MAPA nos vídeos': 'teste',
  'Série para cuidadores/parceiros': 'meu filho',
  'Série TDAH × Comorbidades': 'ansiedade',
  'Mais conteúdo trabalho/estudos': 'trabalho',
  'Planner digital TDAH': 'app',
  'Conteúdo diagnóstico tardio 50+': 'diagnóstico',
};

function ExampleCards({ examples, keyword, onExplore }: { examples?: CommentExample[]; keyword: string; onExplore: (s: string) => void }) {
  if (!examples || examples.length === 0) return null;
  const searchTerm = searchKeywordMap[keyword] || keyword.split(/[\s"\/]+/).filter(Boolean)[0]?.toLowerCase() || keyword;
  return (
    <div style={{ padding: '8px 0 4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
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

export function RecomendacoesTab({ data, onExplore }: Props) {
  const { recommendations } = data;
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {recommendations.map((r, i) => {
        const borderColor = priorityColor(r.priority);
        return (
          <div
            key={r.rank}
            style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderLeft: `4px solid ${borderColor}`,
              borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)',
              padding: '16px 20px',
              cursor: r.examples?.length ? 'pointer' : 'default',
            }}
            onClick={() => r.examples?.length && setExpandedIndex(expandedIndex === i ? null : i)}
          >
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={badge(borderColor)}>#{r.rank}</span>
              <span style={{
                fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)',
                fontFamily: 'var(--font)', flex: 1,
              }}>
                {r.title}
              </span>
              <span style={badge(borderColor)}>{r.priority}</span>
            </div>

            {/* Evidence */}
            <div style={{
              fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font)',
              marginBottom: '10px', lineHeight: 1.4,
            }}>
              Evidencia: "{r.evidence}"
            </div>

            {/* Details row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ fontSize: '12px', fontFamily: 'var(--font)' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Impacto: </span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{r.impact}</span>
              </div>
              <div style={{ fontSize: '12px', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Esforco: </span>
                <span style={badge(effortColor(r.effort))}>{r.effort}</span>
              </div>
              <div style={{ fontSize: '12px', fontFamily: 'var(--font)' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Timeline: </span>
                <span style={{ color: 'var(--text-primary)' }}>{r.timeline}</span>
              </div>
              <div style={{ fontSize: '12px', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Confianca: </span>
                <span style={{ color: 'var(--text-primary)' }}>{r.confidence}</span>
              </div>
            </div>

            {/* Expanded examples */}
            {expandedIndex === i && (
              <ExampleCards examples={r.examples} keyword={r.title} onExplore={onExplore} />
            )}
          </div>
        );
      })}
    </div>
  );
}
