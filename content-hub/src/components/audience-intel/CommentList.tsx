import { useEffect, useState } from 'react';
import { useAudienceIntelStore } from '../../store/useAudienceIntelStore';

const SENTIMENT_COLORS: Record<string, string> = {
  frustracao: '#ef4444', tristeza: '#6366f1', identificacao: '#f59e0b',
  gratidao: '#22c55e', humor: '#ec4899', raiva: '#dc2626',
  esperanca: '#10b981', neutro: '#94a3b8',
};

const SENTIMENT_EMOJI: Record<string, string> = {
  frustracao: '\u{1F62E}\u{200D}\u{1F4A8}', tristeza: '\u{1F622}', identificacao: '\u{1F914}',
  gratidao: '\u{1F64F}', humor: '\u{1F602}', raiva: '\u{1F621}',
  esperanca: '\u{1F331}', neutro: '\u{1F4AC}',
};

function SignalDots({ c }: { c: any }) {
  const signals = [];
  if (c.sinal_conteudo === 'forte') signals.push({ label: 'C', color: '#22c55e' });
  if (c.sinal_produto === 'forte') signals.push({ label: 'P', color: '#3b82f6' });
  if (c.sinal_copy === 'forte') signals.push({ label: 'Cp', color: '#a855f7' });
  if (c.sinal_metodo === 'forte') signals.push({ label: 'M', color: '#f59e0b' });
  if (signals.length === 0) return null;
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {signals.map(s => (
        <span key={s.label} title={
          s.label === 'C' ? 'Sinal de Conteudo forte' :
          s.label === 'P' ? 'Sinal de Produto forte' :
          s.label === 'Cp' ? 'Sinal de Copy forte' :
          'Sinal de Metodo forte'
        } style={{
          width: 20, height: 20, borderRadius: '50%', background: s.color,
          color: '#fff', fontSize: 9, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'help',
        }}>{s.label}</span>
      ))}
    </div>
  );
}

function ExpandedDetails({ c }: { c: any }) {
  return (
    <div style={{
      borderTop: '1px solid var(--border)',
      marginTop: 14,
      paddingTop: 14,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      {/* Signals */}
      {(c.sinal_conteudo !== 'ausente' || c.sinal_produto !== 'ausente' || c.sinal_copy !== 'ausente' || c.sinal_metodo !== 'ausente') && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Sinais</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-secondary)' }}>
            {c.sinal_conteudo !== 'ausente' && <span>Conteudo: <strong style={{ color: c.sinal_conteudo === 'forte' ? '#166534' : '#854d0e' }}>{c.sinal_conteudo}</strong></span>}
            {c.sinal_produto !== 'ausente' && <span>Produto: <strong style={{ color: c.sinal_produto === 'forte' ? '#166534' : '#854d0e' }}>{c.sinal_produto}</strong></span>}
            {c.sinal_copy !== 'ausente' && <span>Copy: <strong style={{ color: c.sinal_copy === 'forte' ? '#166534' : '#854d0e' }}>{c.sinal_copy}</strong></span>}
            {c.sinal_metodo !== 'ausente' && <span>Metodo: <strong style={{ color: c.sinal_metodo === 'forte' ? '#166534' : '#854d0e' }}>{c.sinal_metodo}</strong></span>}
          </div>
        </div>
      )}

      {/* Justificativas */}
      {c.sinal_conteudo !== 'ausente' && c.sinal_conteudo_justificativa && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Conteudo — Justificativa</div>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{c.sinal_conteudo_justificativa}</p>
          {c.sinal_conteudo_sugestoes && (
            <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 12, color: 'var(--text-secondary)' }}>
              {c.sinal_conteudo_sugestoes.map((s: string, i: number) => <li key={i}>{s}</li>)}
            </ul>
          )}
        </div>
      )}

      {c.sinal_produto !== 'ausente' && c.sinal_produto_justificativa && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Produto — Justificativa</div>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{c.sinal_produto_justificativa}</p>
          {c.sinal_produto_sugestoes && (
            <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 12, color: 'var(--text-secondary)' }}>
              {c.sinal_produto_sugestoes.map((s: string, i: number) => <li key={i}>{s}</li>)}
            </ul>
          )}
        </div>
      )}

      {c.sinal_copy !== 'ausente' && c.sinal_copy_justificativa && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Copy — Justificativa</div>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{c.sinal_copy_justificativa}</p>
        </div>
      )}

      {c.sinal_metodo !== 'ausente' && c.sinal_metodo_justificativa && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Metodo — Justificativa</div>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{c.sinal_metodo_justificativa}</p>
        </div>
      )}

      {/* Linguagem exata */}
      {c.linguagem_exata && c.linguagem_exata.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Linguagem exata</div>
          {c.linguagem_exata.map((f: string, i: number) => (
            <div key={i} style={{ fontSize: 12, color: 'var(--accent-gold-dark)', fontStyle: 'italic', marginBottom: 2 }}>"{f}"</div>
          ))}
        </div>
      )}

      {/* Demandas */}
      {c.demandas && c.demandas.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Demandas</div>
          {c.demandas.map((d: any, i: number) => (
            <div key={i} style={{ fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>
              <span style={{ color: d.tipo === 'explicita' ? '#1e40af' : '#6b21a8', fontWeight: 500 }}>{d.tipo}</span>
              {' · '}{d.descricao}
              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}> [{d.categoria}]</span>
            </div>
          ))}
        </div>
      )}

      {/* Perfil */}
      {(c.perfil_genero || c.perfil_diagnostico || c.perfil_faixa_etaria || c.perfil_profissao) && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Perfil</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-secondary)' }}>
            {c.perfil_genero && <span>{c.perfil_genero}</span>}
            {c.perfil_faixa_etaria && <span>· {c.perfil_faixa_etaria}</span>}
            {c.perfil_diagnostico && <span>· {c.perfil_diagnostico}</span>}
            {c.perfil_em_tratamento === true && <span>· em tratamento</span>}
            {c.perfil_profissao && <span>· {c.perfil_profissao}</span>}
            {c.perfil_localizacao && <span>· {c.perfil_localizacao}</span>}
          </div>
        </div>
      )}

      {/* Impacto */}
      {c.impacto_descrito && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Impacto</div>
          <p style={{ fontSize: 12, color: '#22c55e', margin: 0, fontWeight: 500 }}>{c.impacto_descrito}</p>
        </div>
      )}

      {/* Insights */}
      {c.insights_extraidos && c.insights_extraidos.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Insights</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: 'var(--text-secondary)' }}>
            {c.insights_extraidos.map((ins: string, i: number) => <li key={i}>{ins}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

export function CommentItem({ c, showImpact }: { c: any; showImpact?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const sentColor = SENTIMENT_COLORS[c.sentimento_geral] || '#94a3b8';
  const sentEmoji = SENTIMENT_EMOJI[c.sentimento_geral] || '\u{1F4AC}';

  return (
    <div
      style={{
        background: 'var(--bg-card)', padding: '18px 20px',
        borderBottom: '1px solid var(--border)',
        cursor: 'pointer',
      }}
      onClick={() => setExpanded(!expanded)}
    >
      <div style={{ display: 'flex', gap: 12 }}>
        {/* Avatar */}
        <div title={c.sentimento_geral} style={{
          width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
          background: `linear-gradient(135deg, ${sentColor}40, ${sentColor}20)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
        }}>
          {sentEmoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
            <div>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{c.author_name}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>{c.tipo}</span>
            </div>
            {c.like_count > 0 && <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>{c.like_count} ♥</span>}
          </div>

          {/* Impact highlight (for Prova Social) */}
          {showImpact && c.impacto_descrito && (
            <div style={{
              fontSize: 13, color: '#22c55e', fontWeight: 600, marginBottom: 6,
              borderLeft: '2px solid #22c55e', paddingLeft: 8,
            }}>
              {c.impacto_descrito}
            </div>
          )}

          {/* Text */}
          <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.7, marginBottom: 8 }}>
            {expanded ? c.text : (c.text?.slice(0, 300) + ((c.text?.length || 0) > 300 ? '...' : ''))}
            {!expanded && (c.text?.length || 0) > 300 && (
              <span style={{ color: 'var(--accent-gold-dark)', fontSize: 12, marginLeft: 4 }}>ver mais</span>
            )}
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 8 }}>
              {c.video_title}
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
              <SignalDots c={c} />
              {c.tem_demanda && <span style={{ fontSize: 9, fontWeight: 600, color: '#fff', background: '#166534', padding: '2px 8px', borderRadius: 10 }}>demanda</span>}
            </div>
          </div>

          {/* Expanded details */}
          {expanded && <ExpandedDetails c={c} />}
        </div>
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 12, padding: '10px 16px',
      background: 'var(--bg-surface)', borderRadius: 8, marginBottom: 12,
      fontSize: 11, color: 'var(--text-muted)', alignItems: 'center',
    }}>
      <span style={{ fontWeight: 600, color: 'var(--text-secondary)', marginRight: 4 }}>Legenda:</span>

      {/* Sentiment emojis */}
      {Object.entries(SENTIMENT_EMOJI).map(([key, emoji]) => (
        <span key={key}>{emoji} {key}</span>
      ))}

      <span style={{ color: 'var(--border)' }}>|</span>

      {/* Signal dots */}
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
        <span style={{ width: 14, height: 14, borderRadius: '50%', background: '#22c55e', color: '#fff', fontSize: 8, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>C</span>
        conteudo
      </span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
        <span style={{ width: 14, height: 14, borderRadius: '50%', background: '#3b82f6', color: '#fff', fontSize: 8, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>P</span>
        produto
      </span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
        <span style={{ width: 14, height: 14, borderRadius: '50%', background: '#a855f7', color: '#fff', fontSize: 8, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>Cp</span>
        copy
      </span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
        <span style={{ width: 14, height: 14, borderRadius: '50%', background: '#f59e0b', color: '#fff', fontSize: 8, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>M</span>
        metodo
      </span>

      <span style={{ color: 'var(--border)' }}>|</span>

      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
        <span style={{ fontSize: 9, fontWeight: 600, color: '#fff', background: '#166534', padding: '1px 6px', borderRadius: 8 }}>demanda</span>
        tem demanda detectada
      </span>
    </div>
  );
}

export function CommentList() {
  const { comments, loading, fetchComments, filters, subclusters, currentValue } = useAudienceIntelStore();

  useEffect(() => {
    if (comments.items.length === 0 && !loading) fetchComments();
  }, []);

  const loadMore = () => {
    fetchComments({ ...filters, offset: comments.items.length });
  };

  // Find current subcluster info for summary card
  const currentSubcluster = subclusters.find((sc: any) => sc.id === currentValue);

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      {/* Sub-segment summary card */}
      {currentSubcluster && (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--accent-gold-light)',
          borderRadius: 10,
          padding: '16px 20px',
          marginBottom: 16,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
              {currentSubcluster.cluster_name}
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent-gold-dark)' }}>
              {currentSubcluster.count}
            </span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            {currentSubcluster.cluster_description}
          </p>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
          Comentarios ({(comments.total || 0).toLocaleString()})
        </h3>
      </div>

      <Legend />

      {loading && comments.items.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Carregando...</div>
      )}

      <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
        {comments.items.map((c: any) => (
          <CommentItem key={c.id} c={c} />
        ))}
      </div>

      {comments.items.length < (comments.total || 0) && (
        <button
          onClick={loadMore}
          style={{
            display: 'block',
            margin: '16px auto',
            padding: '8px 24px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 13,
            color: 'var(--accent-gold-dark)',
          }}
        >
          Carregar mais ({(comments.total || 0) - comments.items.length} restantes)
        </button>
      )}
    </div>
  );
}
