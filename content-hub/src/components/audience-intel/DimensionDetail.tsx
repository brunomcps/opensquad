import { useEffect, useState } from 'react';
import { useAudienceIntelStore } from '../../store/useAudienceIntelStore';
import { CommentItem } from './CommentList';

export function DimensionDetail() {
  const { currentDimension, dimensionDetail, loading, fetchDimensionDetail, drillDown, fetchComments } = useAudienceIntelStore();
  const [segments, setSegments] = useState<any[]>([]);

  useEffect(() => {
    if (currentDimension && !dimensionDetail) fetchDimensionDetail(currentDimension);
  }, [currentDimension]);

  if (loading || !dimensionDetail) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Carregando...</div>;
  }

  // Demandas view: table of categories
  if (currentDimension === 'demandas' && Array.isArray(dimensionDetail)) {
    return (
      <div>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Demandas por Categoria</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {dimensionDetail.map((d: any) => (
            <button
              key={d.categoria}
              onClick={() => {
                drillDown(4, d.categoria, 'demandas', d.categoria);
              }}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8,
                padding: '12px 16px', cursor: 'pointer', textAlign: 'left',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-gold)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div>
                <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{d.categoria}</span>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {d.explicitas} explicitas | {d.implicitas} implicitas
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent-gold-dark)' }}>{d.total}</span>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>demandas</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Videos view
  if (currentDimension === 'videos' && Array.isArray(dimensionDetail)) {
    return (
      <div>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Videos ({dimensionDetail.length})</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {dimensionDetail.map((v: any) => (
            <button
              key={v.video_id}
              onClick={() => {
                drillDown(5, v.title?.slice(0, 40), 'videos', v.video_id);
                fetchComments({ video_id: v.video_id, limit: 50, sort: 'peso_social' });
              }}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8,
                padding: '14px 16px', cursor: 'pointer', textAlign: 'left', gap: 16,
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-gold)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {v.title}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, display: 'flex', gap: 12 }}>
                  <span>{(v.views || 0).toLocaleString()} views</span>
                  <span>{(v.likes || 0).toLocaleString()} likes</span>
                  <span>{v.subscribers_gained?.toLocaleString() || 0} subs</span>
                  <span>{Math.round(v.avg_view_percentage || 0)}% retencao</span>
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent-gold-dark)' }}>{v.comment_count_classified}</span>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>comentarios</div>
                <div style={{ fontSize: 11, color: v.demand_rate > 25 ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                  {v.demand_rate}% demanda
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Sintomas view
  if (currentDimension === 'sintomas') {
    return <SintomasView drillDown={drillDown} />;
  }

  // Perfil view
  if (currentDimension === 'perfil' && dimensionDetail.genero) {
    const renderDistribution = (title: string, data: any[], filterField: string, limit = 10) => (
      <div style={{ marginBottom: 24 }}>
        <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>{title}</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {data.slice(0, limit).map((d: any) => {
            const maxCount = data[0]?.count || 1;
            return (
              <button
                key={d.value}
                onClick={() => {
                  drillDown(5, `${title}: ${d.value}`, 'perfil');
                  fetchComments({ [filterField]: d.value, limit: 50, sort: 'peso_social' });
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none',
                  cursor: 'pointer', padding: '2px 0', textAlign: 'left',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                <span style={{ width: 130, fontSize: 13, color: 'var(--text-secondary)', textAlign: 'right' }}>{d.value}</span>
                <div style={{ flex: 1, height: 22, background: 'var(--bg-primary)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${(d.count / maxCount) * 100}%`, height: '100%', background: 'var(--accent-gold)', borderRadius: 4, transition: 'width 0.3s' }} />
                </div>
                <span style={{ width: 50, fontSize: 12, color: 'var(--text-muted)', textAlign: 'right' }}>{d.count}</span>
              </button>
            );
          })}
        </div>
      </div>
    );

    // Cross-tabulation gênero × diagnóstico
    const crossGD = dimensionDetail.genero_diagnostico || {};
    const generos = Object.keys(crossGD);
    const diagValues = ['suspeita', 'confirmado', 'negado'];
    let crossMax = 0;
    for (const g of generos) for (const d of diagValues) crossMax = Math.max(crossMax, crossGD[g]?.[d] || 0);

    // Insight text
    const totalGenero = (dimensionDetail.genero || []).reduce((s: number, d: any) => s + d.count, 0);
    const femCount = dimensionDetail.genero?.find((d: any) => d.value === 'feminino')?.count || 0;
    const femPct = totalGenero > 0 ? Math.round(femCount / totalGenero * 100) : 0;
    const suspeitaCount = dimensionDetail.diagnostico?.find((d: any) => d.value === 'suspeita')?.count || 0;
    const confirmadoCount = dimensionDetail.diagnostico?.find((d: any) => d.value === 'confirmado')?.count || 0;

    return (
      <div>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Perfil da Audiencia</h3>

        {/* Insight interpretativo */}
        <div style={{
          background: 'var(--accent-gold-bg)', border: '1px solid var(--accent-gold-light)',
          borderRadius: 8, padding: '12px 16px', marginBottom: 24, fontSize: 13,
          color: 'var(--text-secondary)', lineHeight: 1.6,
        }}>
          Audiencia {femPct}% feminina. {suspeitaCount} com suspeita de TDAH vs {confirmadoCount} com diagnostico confirmado
          — o gap representa {suspeitaCount} pessoas que precisam de direcao para o proximo passo.
          Clique em qualquer barra para ver os comentarios desse segmento.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div>
            {renderDistribution('Genero', dimensionDetail.genero || [], 'perfil_genero')}
            {renderDistribution('Diagnostico', dimensionDetail.diagnostico || [], 'perfil_diagnostico')}
            {renderDistribution('Em Tratamento', dimensionDetail.em_tratamento || [], 'perfil_em_tratamento')}
          </div>
          <div>
            {renderDistribution('Faixa Etaria', dimensionDetail.faixa_etaria || [], 'perfil_faixa_etaria')}
            {(dimensionDetail.profissao || []).length > 0 &&
              renderDistribution('Profissoes Detectadas', dimensionDetail.profissao || [], 'perfil_profissao', 15)}
            {(dimensionDetail.localizacao || []).length > 0 &&
              renderDistribution('Localizacoes', dimensionDetail.localizacao || [], 'perfil_localizacao', 15)}
          </div>
        </div>

        {/* Cruzamento gênero × diagnóstico */}
        {generos.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10 }}>
              Genero x Diagnostico
            </h4>
            <table style={{ borderCollapse: 'collapse', fontSize: 13, width: '100%', maxWidth: 500 }}>
              <thead>
                <tr>
                  <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}></th>
                  {diagValues.map(d => (
                    <th key={d} style={{ padding: '8px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {generos.map(g => (
                  <tr key={g}>
                    <td style={{ padding: '6px 12px', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>{g}</td>
                    {diagValues.map(d => {
                      const val = crossGD[g]?.[d] || 0;
                      const intensity = crossMax > 0 ? val / crossMax : 0;
                      return (
                        <td key={d}
                          onClick={() => {
                            if (val > 0) {
                              drillDown(5, `${g} + ${d}`, 'perfil');
                              fetchComments({ perfil_genero: g, perfil_diagnostico: d, limit: 50, sort: 'peso_social' });
                            }
                          }}
                          style={{
                            padding: '6px 12px', textAlign: 'center', borderBottom: '1px solid var(--border)',
                            background: val > 0 ? `rgba(240, 186, 60, ${0.1 + intensity * 0.5})` : 'transparent',
                            fontWeight: val > 100 ? 600 : 400,
                            cursor: val > 0 ? 'pointer' : 'default',
                          }}
                        >
                          {val || ''}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Segmentos de audiência */}
        <SegmentCards segments={segments} setSegments={setSegments} drillDown={drillDown} fetchComments={fetchComments} />

        {/* Botão superfãs */}
        <div style={{ marginTop: 24 }}>
          <button
            onClick={() => {
              drillDown(3, 'Superfas', 'superfans');
            }}
            style={{
              background: 'var(--accent-gold)', color: '#fff', border: 'none', borderRadius: 8,
              padding: '10px 20px', cursor: 'pointer', fontSize: 14, fontWeight: 600, width: '100%',
            }}
          >
            Ver Superfas →
          </button>
        </div>
      </div>
    );
  }

  // Prova social view — categorized
  if (currentDimension === 'prova_social') {
    return <ProvaSocialView dimensionDetail={dimensionDetail} drillDown={drillDown} />;
  }

  // Tipo × Sentimento matrix
  if (currentDimension === 'tipo_sentimento' && typeof dimensionDetail === 'object' && !Array.isArray(dimensionDetail)) {
    const tipos = Object.keys(dimensionDetail);
    const allSentimentos = new Set<string>();
    for (const t of tipos) {
      for (const s of Object.keys(dimensionDetail[t])) allSentimentos.add(s);
    }
    const sentimentos = Array.from(allSentimentos);

    // Find max for color scale
    let maxVal = 0;
    for (const t of tipos) for (const s of sentimentos) maxVal = Math.max(maxVal, dimensionDetail[t]?.[s] || 0);

    return (
      <div>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Jornada Emocional — Tipo x Sentimento</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%' }}>
            <thead>
              <tr>
                <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}></th>
                {sentimentos.map(s => (
                  <th key={s} style={{ padding: '8px 6px', textAlign: 'center', borderBottom: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)' }}>{s}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tipos.map(t => (
                <tr key={t}>
                  <td style={{ padding: '6px 12px', fontWeight: 600, borderBottom: '1px solid var(--border)', color: 'var(--text-primary)' }}>{t}</td>
                  {sentimentos.map(s => {
                    const val = dimensionDetail[t]?.[s] || 0;
                    const intensity = val / maxVal;
                    return (
                      <td key={s} style={{
                        padding: '6px',
                        textAlign: 'center',
                        borderBottom: '1px solid var(--border)',
                        background: val > 0 ? `rgba(240, 186, 60, ${0.1 + intensity * 0.6})` : 'transparent',
                        fontWeight: val > 50 ? 600 : 400,
                        cursor: val > 0 ? 'pointer' : 'default',
                      }}
                        onClick={() => {
                          if (val > 0) {
                            drillDown(5, `${t} + ${s}`, 'tipo_sentimento');
                            fetchComments({ tipo: t, sentimento: s, limit: 50, sort: 'peso_social' });
                          }
                        }}
                      >
                        {val || ''}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Fallback: raw JSON
  return (
    <div>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>{currentDimension}</h3>
      <pre style={{ fontSize: 12, background: 'var(--bg-primary)', padding: 16, borderRadius: 8, overflow: 'auto', maxHeight: 600 }}>
        {JSON.stringify(dimensionDetail, null, 2)}
      </pre>
    </div>
  );
}

// ============================================================
// Segment Cards component (used inside Perfil view)
// ============================================================

function SegmentCards({ segments, setSegments, drillDown, fetchComments }: {
  segments: any[];
  setSegments: (s: any[]) => void;
  drillDown: any;
  fetchComments: any;
}) {
  useEffect(() => {
    if (segments.length === 0) {
      fetch('/api/audience/v2/segments')
        .then(r => r.json())
        .then(data => setSegments(data))
        .catch(() => {});
    }
  }, []);

  if (segments.length === 0) return null;

  const layers = [
    { key: 'jornada', title: 'Por Estagio na Jornada' },
    { key: 'papel', title: 'Por Papel / Relacao' },
    { key: 'profissao', title: 'Por Profissao' },
  ];

  return (
    <div style={{ marginTop: 32 }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>
        Segmentos de Audiencia
      </h3>

      {layers.map(layer => {
        const layerSegments = segments.filter((s: any) => s.layer === layer.key);
        if (layerSegments.length === 0) return null;
        return (
          <div key={layer.key} style={{ marginBottom: 24 }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {layer.title}
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
              {layerSegments.map((seg: any, i: number) => (
                <button
                  key={i}
                  onClick={async () => {
                    if (seg.count >= 50) {
                      // Segments with 50+ comments have sub-segments → level 4
                      drillDown(4, seg.name, 'segment', seg.id);
                    } else {
                      // Small segments → go directly to comments (level 5)
                      useAudienceIntelStore.setState({ loading: true });
                      const res = await fetch(`/api/audience/v2/segments/${seg.id}/comments?limit=50`);
                      const data = await res.json();
                      useAudienceIntelStore.setState({ comments: data, loading: false });
                      drillDown(5, seg.name, 'segment', seg.id);
                    }
                  }}
                  style={{
                    background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10,
                    padding: '14px 16px', cursor: 'pointer', textAlign: 'left',
                    transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-gold)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 20 }}>{seg.emoji}</span>
                      <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{seg.name}</span>
                    </div>
                    <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent-gold-dark)', flexShrink: 0, marginLeft: 8 }}>
                      {seg.count}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                    {seg.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// Sintomas View (Level 3)
// ============================================================

const INTENSITY_DATA: Record<string, { intensity: number; frustPct: number; demPct: number; quote: string }> = {
  'Exaustao e fadiga cronica': { intensity: 7.1, frustPct: 58, demPct: 69, quote: 'Eu ja fiquei 3 dias de cama. Esgotamento total.' },
  'Procrastinacao': { intensity: 7.1, frustPct: 40, demPct: 69, quote: 'Ha decadas venho lutando com a procrastinacao e apatia. Arrumar a casa e um martirio.' },
  'Hiperatividade mental': { intensity: 7.0, frustPct: 50, demPct: 50, quote: 'Minha mente parou com os pensamentos em excesso. Como e bom ser normal.' },
  'Montanha-russa emocional': { intensity: 6.9, frustPct: 56, demPct: 64, quote: 'Pavio curto do nada. Associava isso a outros problemas, mas era TDAH.' },
  'Sensibilidade a rejeicao': { intensity: 6.8, frustPct: 44, demPct: 63, quote: 'Qualquer critica me destroi. A falta de reconhecimento no trabalho me doia demais.' },
  'Paralisia executiva': { intensity: 6.6, frustPct: 51, demPct: 54, quote: 'Paralisia de analise me pegou demais. Achava que era indecisao minha.' },
  'Autoestima destruida e culpa': { intensity: 6.5, frustPct: 49, demPct: 56, quote: 'Sempre me achei incompetente, preguicoso, um lixo. Agora sei que era TDAH.' },
  'Cegueira temporal e atrasos': { intensity: 6.5, frustPct: 39, demPct: 49, quote: 'Nao consigo dimensionar o tempo. Como diz minha esposa: acorda cedo pra se atrasar.' },
  'Impulsividade e compulsao': { intensity: 6.5, frustPct: 46, demPct: 51, quote: 'Me empolgo, falo demais, perco o controle. Depois me arrependo.' },
  'Ansiedade': { intensity: 6.4, frustPct: 41, demPct: 58, quote: 'Tratei ansiedade por 20 anos. Era TDAH o tempo todo.' },
  'Desatencao e falta de foco': { intensity: 6.2, frustPct: 37, demPct: 51, quote: 'Um potencial enorme, mas me distraio com facilidade. As oportunidades passam.' },
  'Dificuldade com rotina': { intensity: 6.1, frustPct: 38, demPct: 51, quote: 'Sou otimo pra resolver sob pressao, pessimo pra trabalho de rotina.' },
  'Agitacao e inquietude': { intensity: 6.1, frustPct: 35, demPct: 42, quote: 'A agitacao toda esta dentro da minha cabeca. Por fora pareco calma.' },
  'Esquecimento e memoria': { intensity: 6.0, frustPct: 35, demPct: 45, quote: 'Minha chefe me passou um recado. Esqueci tudo. Nesse nivel.' },
  'Projetos inacabados': { intensity: 6.0, frustPct: 45, demPct: 40, quote: 'Fabrica de projetos mas nenhum foi executado.' },
  'Insonia e problemas de sono': { intensity: 5.9, frustPct: 32, demPct: 40, quote: 'So consigo dormir de madrugada. De manha ate acordo, mas levantar e um Deus me acuda.' },
  'Mascaramento': { intensity: 5.9, frustPct: 29, demPct: 33, quote: 'Performei tanto que acabei fazendo curso de teatro por hobby.' },
  'Hiperfoco': { intensity: 5.8, frustPct: 33, demPct: 41, quote: 'Comecei as 8 da noite e quando me dei conta era 10:30 da manha do dia seguinte.' },
  'Desorganizacao e acumulo': { intensity: 5.8, frustPct: 45, demPct: 41, quote: 'Pior e quando jogamos fora e no dia seguinte precisamos dele.' },
  'Saudade e indiferenca emocional': { intensity: 4.9, frustPct: 21, demPct: 20, quote: 'Mando parabens mentalmente. Lembro dos aniversarios mas falta vontade de ligar.' },
};

const CO_OCCURRENCE_DATA = [
  { pair: 'Esquecimento + Exaustao', count: 37, quote: 'Cansado o tempo todo e muito esquecimento.' },
  { pair: 'Autoestima + Saudade', count: 35, quote: 'Nao sinto saudades e me sinto culpado por isso.' },
  { pair: 'Esquecimento + Saudade', count: 33, quote: 'Minha mae faleceu mas tem horas que eu esqueco. E como se ela estivesse na vizinha.' },
  { pair: 'Esquecimento + Hiperfoco', count: 32, quote: 'Hiperfoco e esquecimentos. Lembro de detalhes inuteis, esqueco o que importa.' },
  { pair: 'Autoestima + Esquecimento', count: 29, quote: 'Sempre me culpei por esquecer tudo. Me achei incompetente a vida inteira.' },
  { pair: 'Desatencao + Esquecimento', count: 26, quote: 'Me distraio e esqueco o que estava fazendo. Volto pro inicio sem saber onde parei.' },
  { pair: 'Autoestima + Exaustao', count: 26, quote: 'Me sinto fracassada e exausta. Nao consigo produzir e me culpo por isso.' },
  { pair: 'Esquecimento + Procrastinacao', count: 24, quote: 'Procrastino e quando finalmente vou fazer, esqueci como.' },
  { pair: 'Exaustao + Procrastinacao', count: 22, quote: 'Exaustao cronica, esquecimento, procrastinacao. Acho que todos.' },
  { pair: 'Exaustao + Hiperfoco', count: 21, quote: 'Hiperfoco me drena. Depois fico dias exausta sem conseguir fazer nada.' },
  { pair: 'Desatencao + Hiperfoco', count: 20, quote: 'Ou foco demais ou nao foco em nada. Nao existe meio-termo.' },
  { pair: 'Ansiedade + Autoestima', count: 19, quote: 'Ansiedade de nao ser boa o suficiente. Me cobro o tempo inteiro.' },
  { pair: 'Ansiedade + Procrastinacao', count: 19, quote: 'Procrastino por ansiedade e fico ansiosa por procrastinar. Ciclo infinito.' },
  { pair: 'Exaustao + Paralisia', count: 18, quote: 'Exaustao e paralisia. Sei o que preciso fazer mas meu corpo nao obedece.' },
  { pair: 'Ansiedade + Esquecimento', count: 17, quote: 'Ansiedade porque sei que vou esquecer algo importante. E esqueco.' },
];

function SintomasView({ drillDown }: { drillDown: any }) {
  const [sintomas, setSintomas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/audience/v2/subclusters/sintoma/todos')
      .then(r => r.json())
      .then(data => {
        setSintomas(data.sort((a: any, b: any) => b.count - a.count));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Carregando...</div>;

  const maxCount = sintomas[0]?.count || 1;

  return (
    <div>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Mapa de Sintomas</h3>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.6 }}>
        20 sintomas detectados por keyword matching em 9.047 comentarios. 1.923 comentarios mencionam pelo menos 1 sintoma.
        Clique num sintoma pra ver os comentarios.
      </p>

      {/* Legend */}
      <div style={{
        display: 'flex', gap: 16, marginBottom: 20, fontSize: 11, color: 'var(--text-muted)', alignItems: 'center',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 12, height: 12, borderRadius: 2, background: 'linear-gradient(90deg, rgba(240,186,60,0.3), rgba(240,186,60,0.6))' }} />
          Frequencia (quantos mencionam)
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 12, height: 12, borderRadius: 2, background: 'linear-gradient(90deg, rgba(239,68,68,0.3), rgba(239,68,68,0.7))' }} />
          Intensidade (quanto incomoda)
        </span>
      </div>

      {/* Ranking with dual bars */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {sintomas.map((s: any) => {
            const iData = INTENSITY_DATA[s.cluster_name];
            const intensity = iData?.intensity || 5;
            const frustPct = iData?.frustPct || 0;
            const demPct = iData?.demPct || 0;
            return (<>
              <button
                key={s.id}
                onClick={async () => {
                  useAudienceIntelStore.setState({ loading: true });
                  const res = await fetch(`/api/audience/v2/subclusters/${s.id}/comments?limit=50`);
                  const data = await res.json();
                  useAudienceIntelStore.setState({ comments: data, loading: false, subclusters: sintomas });
                  drillDown(5, s.cluster_name, 'subcluster', s.id);
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, background: 'none',
                  border: 'none', cursor: 'pointer', padding: '8px 4px', textAlign: 'left', width: '100%',
                  borderRadius: 6, transition: 'background 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(240,186,60,0.06)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', width: 210, flexShrink: 0 }}>
                  {s.cluster_name}
                </span>
                {/* Dual bars */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {/* Frequency bar */}
                  <div style={{ height: 10, background: 'var(--bg-surface)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      width: `${(s.count / maxCount * 100)}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, rgba(240,186,60,0.3), rgba(240,186,60,0.6))',
                      borderRadius: 3,
                    }} />
                  </div>
                  {/* Intensity bar */}
                  <div style={{ height: 10, background: 'var(--bg-surface)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      width: `${(intensity / 10 * 100)}%`,
                      height: '100%',
                      background: `linear-gradient(90deg, rgba(239,68,68,0.3), rgba(239,68,68,${Math.min(intensity / 8, 1).toFixed(1)}))`,
                      borderRadius: 3,
                    }} />
                  </div>
                </div>
                {/* Stats */}
                <div style={{ width: 80, flexShrink: 0, textAlign: 'right' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-gold-dark)' }}>{s.count}</div>
                  <div style={{ fontSize: 11, color: intensity >= 6.5 ? '#ef4444' : '#94a3b8', fontWeight: intensity >= 6.5 ? 600 : 400 }}>
                    {intensity.toFixed(1)}/10
                  </div>
                </div>
              </button>
              {iData?.quote && (
                <div style={{ marginLeft: 218, fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: -4, marginBottom: 4, paddingLeft: 4, borderLeft: '2px solid var(--accent-gold-light)' }}>
                  &ldquo;{iData.quote}&rdquo;
                </div>
              )}
            </>);
          })}
        </div>
      </div>

      {/* Co-occurrence */}
      <div>
        <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
          Sintomas que aparecem juntos
        </h4>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
          Quando uma pessoa menciona um sintoma, qual outro costuma aparecer junto?
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {CO_OCCURRENCE_DATA.map((pair, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px',
              background: i < 5 ? 'rgba(240,186,60,0.06)' : 'transparent',
              borderRadius: 6,
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-gold-dark)', width: 30, textAlign: 'right', flexShrink: 0 }}>
                {pair.count}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
                    {pair.pair}
                  </span>
                  {i < 3 && <span style={{ fontSize: 10, color: 'var(--accent-gold-dark)', fontWeight: 600, background: 'rgba(240,186,60,0.15)', padding: '1px 8px', borderRadius: 10 }}>forte</span>}
                </div>
                {pair.quote && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 2 }}>
                    &ldquo;{pair.quote}&rdquo;
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Prova Social View (Level 3) — Categorized
// ============================================================

const PROVA_CATEGORIES = [
  { id: 'transformacao_emocional', name: 'Alivio emocional', emoji: '\u{1F4A7}', color: '#22c55e' },
  { id: 'transformacao_comportamental', name: 'Tomou uma acao', emoji: '\u{1F3AF}', color: '#3b82f6' },
  { id: 'amplificacao', name: 'Espalhou pra outros', emoji: '\u{1F4E2}', color: '#f59e0b' },
  { id: 'validacao_comparacao', name: 'Melhor que alternativa paga', emoji: '\u{1F947}', color: '#a855f7' },
  { id: 'transformacao_relacional', name: 'Mudou uma relacao', emoji: '\u{1F91D}', color: '#ec4899' },
  { id: 'validacao_autoridade', name: 'Profissional confirma', emoji: '\u{1F3C5}', color: '#14b8a6' },
];

function ProvaSocialView({ dimensionDetail, drillDown }: { dimensionDetail: any; drillDown: any }) {
  const [categories, setCategories] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [activeSubcat, setActiveSubcat] = useState<string | null>(null);
  const [catComments, setCatComments] = useState<any[]>([]);
  const [loadingCat, setLoadingCat] = useState(false);

  useEffect(() => {
    fetch('/api/audience/v2/subclusters/prova_social/impacto')
      .then(r => r.json())
      .then(data => setCategories(data.sort((a: any, b: any) => {
        if (a.cluster_name === 'Elogios gerais') return 1;
        if (b.cluster_name === 'Elogios gerais') return -1;
        return b.count - a.count;
      })))
      .catch(() => {});
  }, []);

  const handleCategoryClick = async (cat: any) => {
    if (activeCategory === cat.cluster_name) {
      setActiveCategory(null); setSubcategories([]); setActiveSubcat(null); setCatComments([]);
      return;
    }
    setActiveCategory(cat.cluster_name);
    setActiveSubcat(null);
    setCatComments([]);
    setLoadingCat(true);

    // Categories with 50+ comments have subcategories
    if (cat.count >= 50) {
      const res = await fetch(`/api/audience/v2/subclusters/prova_social/${encodeURIComponent(cat.cluster_name)}`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setSubcategories(data.sort((a: any, b: any) => {
          if (a.cluster_name === 'Outros') return 1;
          if (b.cluster_name === 'Outros') return -1;
          return b.count - a.count;
        }));
        setLoadingCat(false);
        return;
      }
    }
    // No subcategories — load comments directly
    setSubcategories([]);
    const res = await fetch(`/api/audience/v2/subclusters/${cat.id}/comments?limit=20`);
    const data = await res.json();
    setCatComments(data.items || []);
    setLoadingCat(false);
  };

  const handleSubcatClick = async (sc: any) => {
    if (activeSubcat === sc.id) { setActiveSubcat(null); setCatComments([]); return; }
    setActiveSubcat(sc.id);
    setLoadingCat(true);
    const res = await fetch(`/api/audience/v2/subclusters/${sc.id}/comments?limit=20`);
    const data = await res.json();
    setCatComments(data.items || []);
    setLoadingCat(false);
  };

  // Total unique across ALL categories (including generic)
  const allIds = new Set<string>();
  for (const cat of categories) {
    if (cat.comment_ids) for (const id of cat.comment_ids) allIds.add(id);
  }
  const totalElogios = allIds.size || categories.reduce((s: number, c: any) => s + c.count, 0);
  const impactCategories = categories.filter((c: any) => c.cluster_name !== 'Elogios gerais');
  const totalWithImpact = impactCategories.reduce((s: number, c: any) => s + c.count, 0);
  const genericCat = categories.find((c: any) => c.cluster_name === 'Elogios gerais');
  const totalGeneric = genericCat?.count || 0;
  const pctWithImpact = totalElogios > 0 ? Math.round(totalWithImpact / totalElogios * 100) : 0;

  return (
    <div>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Prova Social</h3>

      {/* Summary stats */}
      <div style={{
        display: 'flex', gap: 24, marginBottom: 20, padding: '14px 20px',
        background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10,
        flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent-gold-dark)' }}>{totalElogios.toLocaleString()}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>elogios totais</div>
        </div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#22c55e' }}>{totalWithImpact}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>com impacto real ({pctWithImpact}%)</div>
        </div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-secondary)' }}>{totalGeneric}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>elogios gerais</div>
        </div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#3b82f6' }}>6</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>tipos de impacto</div>
        </div>
      </div>

      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
        Dos {totalElogios.toLocaleString()} elogios, <strong style={{ color: '#22c55e' }}>{totalWithImpact}</strong> descrevem
        um impacto concreto na vida da pessoa. Clique numa categoria pra ver os depoimentos.
      </p>

      {/* Category cards — impact categories */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10, marginBottom: 16 }}>
        {impactCategories.map((cat: any) => {
          const meta = PROVA_CATEGORIES.find(p => cat.cluster_name.toLowerCase().includes(p.name.toLowerCase().split(' ')[0]));
          const color = meta?.color || '#94a3b8';
          const isActive = activeCategory === cat.cluster_name;
          return (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat)}
              style={{
                background: isActive ? `${color}10` : 'var(--bg-card)',
                border: `1px solid ${isActive ? color : 'var(--border)'}`,
                borderRadius: 10, padding: '14px 18px', cursor: 'pointer', textAlign: 'left',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
                  {cat.cluster_name}
                </span>
                <span style={{ fontSize: 16, fontWeight: 700, color }}>{cat.count}</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 8px', lineHeight: 1.4 }}>
                {cat.cluster_description}
              </p>
              {cat.example_quotes && cat.example_quotes[0] && (
                <div style={{
                  fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic',
                  borderLeft: `2px solid ${color}`, paddingLeft: 8,
                }}>
                  &ldquo;{cat.example_quotes[0].slice(0, 100)}{cat.example_quotes[0].length > 100 ? '...' : ''}&rdquo;
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Generic elogios card (more subdued) */}
      {genericCat && (
        <button
          onClick={() => handleCategoryClick(genericCat)}
          style={{
            width: '100%',
            background: activeCategory === 'Elogios gerais' ? 'var(--bg-hover)' : 'var(--bg-card)',
            border: `1px solid var(--border)`,
            borderRadius: 10, padding: '12px 18px', cursor: 'pointer', textAlign: 'left',
            marginBottom: 16, transition: 'all 0.15s',
            opacity: activeCategory === 'Elogios gerais' ? 1 : 0.7,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Elogios gerais (sem impacto especifico documentado)
            </span>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>{genericCat.count}</span>
          </div>
        </button>
      )}

      {/* Subcategories (when a big category is expanded) */}
      {activeCategory && subcategories.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>
            {activeCategory}
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 8 }}>
            {subcategories.map((sc: any) => {
              const isActive = activeSubcat === sc.id;
              return (
                <button
                  key={sc.id}
                  onClick={() => handleSubcatClick(sc)}
                  style={{
                    background: isActive ? 'var(--bg-hover)' : 'var(--bg-card)',
                    border: `1px solid ${isActive ? 'var(--accent-gold)' : 'var(--border)'}`,
                    borderRadius: 8, padding: '10px 14px', cursor: 'pointer', textAlign: 'left',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-primary)' }}>
                      {sc.cluster_name}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent-gold-dark)' }}>{sc.count}</span>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                    {sc.cluster_description?.slice(0, 100)}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Comments (from direct category or subcategory) */}
      {activeCategory && (activeSubcat || (subcategories.length === 0 && catComments.length > 0)) && (
        <div style={{ marginBottom: 24, maxWidth: 680 }}>
          {activeSubcat && (
            <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>
              {subcategories.find((s: any) => s.id === activeSubcat)?.cluster_name}
            </h4>
          )}
          {!activeSubcat && subcategories.length === 0 && (
            <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>
              {activeCategory}
            </h4>
          )}
          {loadingCat && <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Carregando...</div>}
          <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
            {catComments.map((e: any) => (
              <CommentItem key={e.id} c={e} showImpact />
            ))}
          </div>
        </div>
      )}

      {loadingCat && subcategories.length === 0 && catComments.length === 0 && (
        <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Carregando...</div>
      )}
    </div>
  );
}
