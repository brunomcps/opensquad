import { useAudienceIntelStore } from '../../store/useAudienceIntelStore';
import { SignalBadge } from './SignalBadge';

export function CommentCard() {
  const { selectedComment: c, navigateTo, currentLevel } = useAudienceIntelStore();
  if (!c) return null;

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {title}
      </div>
      {children}
    </div>
  );

  return (
    <div style={{ maxWidth: 800 }}>
      <button
        onClick={() => navigateTo(currentLevel === 5 ? 3 : 2)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-gold-dark)', fontSize: 13, marginBottom: 16, padding: 0 }}
      >
        ← Voltar
      </button>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.author_name}</span>
            {c.nome_detectado && <span style={{ color: 'var(--text-muted)', fontSize: 13 }}> ({c.nome_detectado})</span>}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>PS: {c.peso_social}</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.like_count} likes</span>
          </div>
        </div>

        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
          {c.video_title}
        </div>

        {/* Comment text */}
        <div style={{
          background: 'var(--bg-primary)',
          borderRadius: 8,
          padding: 16,
          marginBottom: 20,
          fontSize: 14,
          lineHeight: 1.6,
          color: 'var(--text-primary)',
          borderLeft: '3px solid var(--accent-gold)',
        }}>
          {c.text}
        </div>

        {/* Classification badges */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, background: '#e0e7ff', color: '#3730a3' }}>{c.tipo}</span>
          <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, background: '#fce7f3', color: '#9d174d' }}>{c.sentimento_geral}</span>
          {c.tem_demanda && <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, background: '#dcfce7', color: '#166534' }}>tem demanda</span>}
          {c.elogio_tipo === 'qualificado' && <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, background: '#fef3c7', color: '#92400e' }}>elogio qualificado</span>}
        </div>

        {/* Signals */}
        <Section title="Sinais">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <SignalBadge value={c.sinal_conteudo} label="Conteudo" />
            <SignalBadge value={c.sinal_produto} label="Produto" />
            <SignalBadge value={c.sinal_copy} label="Copy" />
            <SignalBadge value={c.sinal_metodo} label="Metodo" />
          </div>
        </Section>

        {/* Justificativas */}
        {c.sinal_conteudo !== 'ausente' && c.sinal_conteudo_justificativa && (
          <Section title="Conteudo — Justificativa">
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{c.sinal_conteudo_justificativa}</p>
            {c.sinal_conteudo_sugestoes && (
              <ul style={{ margin: '8px 0 0', paddingLeft: 20, fontSize: 13, color: 'var(--text-secondary)' }}>
                {c.sinal_conteudo_sugestoes.map((s: string, i: number) => <li key={i}>{s}</li>)}
              </ul>
            )}
          </Section>
        )}

        {c.sinal_produto !== 'ausente' && c.sinal_produto_justificativa && (
          <Section title="Produto — Justificativa">
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{c.sinal_produto_justificativa}</p>
            {c.sinal_produto_sugestoes && (
              <ul style={{ margin: '8px 0 0', paddingLeft: 20, fontSize: 13, color: 'var(--text-secondary)' }}>
                {c.sinal_produto_sugestoes.map((s: string, i: number) => <li key={i}>{s}</li>)}
              </ul>
            )}
          </Section>
        )}

        {c.sinal_copy !== 'ausente' && c.sinal_copy_justificativa && (
          <Section title="Copy — Justificativa">
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{c.sinal_copy_justificativa}</p>
          </Section>
        )}

        {c.sinal_metodo !== 'ausente' && c.sinal_metodo_justificativa && (
          <Section title="Metodo — Justificativa">
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{c.sinal_metodo_justificativa}</p>
            {c.sinal_metodo_sugestoes && (
              <ul style={{ margin: '8px 0 0', paddingLeft: 20, fontSize: 13, color: 'var(--text-secondary)' }}>
                {c.sinal_metodo_sugestoes.map((s: string, i: number) => <li key={i}>{s}</li>)}
              </ul>
            )}
          </Section>
        )}

        {/* Linguagem exata */}
        {c.linguagem_exata && c.linguagem_exata.length > 0 && (
          <Section title="Linguagem exata (Copy)">
            {c.linguagem_exata.map((f: string, i: number) => (
              <div key={i} style={{ fontSize: 13, color: 'var(--accent-gold-dark)', fontStyle: 'italic', marginBottom: 4 }}>
                "{f}"
              </div>
            ))}
          </Section>
        )}

        {/* Demandas */}
        {c.demandas && c.demandas.length > 0 && (
          <Section title="Demandas detectadas">
            {c.demandas.map((d: any, i: number) => (
              <div key={i} style={{ fontSize: 13, marginBottom: 6 }}>
                <span style={{ padding: '1px 6px', borderRadius: 4, fontSize: 10, background: d.tipo === 'explicita' ? '#dbeafe' : '#f3e8ff', color: d.tipo === 'explicita' ? '#1e40af' : '#6b21a8', marginRight: 6 }}>
                  {d.tipo}
                </span>
                <span style={{ color: 'var(--text-secondary)' }}>{d.descricao}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 6 }}>[{d.categoria}]</span>
              </div>
            ))}
          </Section>
        )}

        {/* Perfil */}
        {(c.perfil_genero || c.perfil_diagnostico || c.perfil_faixa_etaria || c.perfil_profissao) && (
          <Section title="Perfil detectado">
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 13, color: 'var(--text-secondary)' }}>
              {c.perfil_genero && <span>Genero: {c.perfil_genero}</span>}
              {c.perfil_faixa_etaria && <span>Idade: {c.perfil_faixa_etaria}</span>}
              {c.perfil_diagnostico && <span>Diagnostico: {c.perfil_diagnostico}</span>}
              {c.perfil_em_tratamento !== null && <span>Tratamento: {c.perfil_em_tratamento ? 'sim' : 'nao'}</span>}
              {c.perfil_profissao && <span>Profissao: {c.perfil_profissao}</span>}
              {c.perfil_localizacao && <span>Local: {c.perfil_localizacao}</span>}
              {c.perfil_estado_civil && <span>Estado civil: {c.perfil_estado_civil}</span>}
            </div>
          </Section>
        )}

        {/* Impacto */}
        {c.impacto_descrito && (
          <Section title="Impacto descrito">
            <p style={{ fontSize: 13, color: 'var(--accent-green)', margin: 0, fontWeight: 500 }}>{c.impacto_descrito}</p>
          </Section>
        )}

        {/* Insights */}
        {c.insights_extraidos && c.insights_extraidos.length > 0 && (
          <Section title="Insights extraidos">
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: 'var(--text-secondary)' }}>
              {c.insights_extraidos.map((ins: string, i: number) => <li key={i}>{ins}</li>)}
            </ul>
          </Section>
        )}
      </div>
    </div>
  );
}
