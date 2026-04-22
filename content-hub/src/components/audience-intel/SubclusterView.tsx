import { useEffect, useState } from 'react';
import { useAudienceIntelStore } from '../../store/useAudienceIntelStore';

const CLUSTER_EMOJIS: Record<string, string> = {
  // Metodo clusters
  'rotina_matinal': '\u{1F305}',
  'estudo_aprendizado': '\u{1F4DA}',
  'organizacao_sistemas': '\u{1F4CB}',
  'exercicio_corpo': '\u{1F3CB}\u{FE0F}',
  'gestao_tempo_pontualidade': '\u{23F0}',
  'medicacao_suplementos': '\u{1F48A}',
  'regulacao_emocional_metodos': '\u{1F9D8}',
  'produtividade_foco': '\u{26A1}',
  'alimentacao_sono': '\u{1F966}',
  'relacionamentos_sociais': '\u{1F91D}',
  'carreira_trabalho': '\u{1F4BC}',
  // Conteudo clusters
  'TEA / Autismo / Masking': '\u{1F9E9}',
  'Bipolar / TOC / Ansiedade': '\u{1F500}',
  'Superdotac': '\u{1F9E0}',
  'Relacionamentos e casais': '\u{1F491}',
  'Emocoes e regulacao': '\u{1F3AD}',
  'Menopausa': '\u{2640}\u{FE0F}',
  'Vicios, dependencia': '\u{26A0}\u{FE0F}',
  'Trabalho e carreira': '\u{1F4BC}',
  'Familia: pais': '\u{1F469}\u{200D}\u{1F467}',
  'Sono, exercicio': '\u{1F319}',
  'Neurociencia e cerebro': '\u{1F9EC}',
  'Diagnostico tardio e idosos': '\u{23F3}',
  'Medicacao e tratamento': '\u{1F48A}',
  // Produto clusters
  'Diagnostico e proximo passo': '\u{1F9ED}',
  'Pos-diagnostico e reconstrucao': '\u{1F3D7}\u{FE0F}',
  'Familiares e psicoeducacao': '\u{1F46A}',
  'Consulta e acesso profissional': '\u{1F3E5}',
  'Barreira financeira': '\u{1F4B8}',
  'Profissionais de alta performance': '\u{1F3C6}',
  'Procrastinacao e paralisia cronica': '\u{1F6D1}',
  'Dor emocional e ideacao suicida': '\u{1F198}',
  'Sono, rotina e organizacao': '\u{1F4CB}',
  'Tratamento que falhou': '\u{274C}',
  'Busca explicita de direcao': '\u{1F4A2}',
  'Ferramentas e metodologia': '\u{1F527}',
  'TDAH destruindo carreira': '\u{1F4C9}',
  'Relacionamentos destruidos': '\u{1F494}',
  'Dor cronica e urgencia': '\u{1F6A8}',
  // Copy clusters
  'Headlines e hooks prontos': '\u{1F3AF}',
  'Metaforas e imagens originais': '\u{1F308}',
  'Contrastes poderosos': '\u{26A1}',
  'Frases concisas e emocionais': '\u{1F4AC}',
  'Narrativas de vida': '\u{1F4D6}',
  'Identificacao universal': '\u{1FA9E}',
  'Dor emocional crua': '\u{1F494}',
  'Humor e auto-ironia': '\u{1F602}',
  'Culpa, rotulos e estigma': '\u{1F3F7}\u{FE0F}',
  'Prova social e autoridade': '\u{1F3C6}',
  'Saudade e relacionamentos': '\u{1F49C}',
  'Descoberta tardia e idade': '\u{231B}',
  'Trabalho e carreira': '\u{1F4BC}',
  // Demanda clusters (by cluster_name keywords)
  'Busca por profissional': '\u{1F50D}',
  'Diagnostico tardio': '\u{23F3}',
  'Suspeita sem acao': '\u{2753}',
  'Barreira financeira': '\u{1F4B8}',
  'Confusao diagnostica': '\u{1F500}',
  'Perdido apos diagnostico': '\u{1F9ED}',
  'Invalidacao': '\u{1F6AB}',
  'Procrastinacao': '\u{1F6D1}',
  'Projetos inacabados': '\u{1F3D7}\u{FE0F}',
  'Foco e concentracao': '\u{1F3AF}',
  'Sofrimento no trabalho': '\u{1F62E}\u{200D}\u{1F4A8}',
  'Busca por sistemas': '\u{1F527}',
  'Explosoes emocionais': '\u{1F4A5}',
  'Exaustao emocional': '\u{1F6CF}\u{FE0F}',
  'Culpa e vergonha': '\u{1F614}',
  'Disforia de rejeicao': '\u{1F494}',
  'Compulsao': '\u{1F6D2}',
  'Conflito conjugal': '\u{1F48D}',
  'Isolamento social': '\u{1F3DD}\u{FE0F}',
  'Conflito familiar': '\u{1F3E0}',
  'Indiferenca emocional': '\u{2744}\u{FE0F}',
  'Perda de relacionamentos': '\u{1F614}',
  'Sentimento de ser defeituoso': '\u{1FA9E}',
  'Culpa cronica': '\u{1F3CB}\u{FE0F}',
  'Luto da vida perdida': '\u{231B}',
  'Nao pertencimento': '\u{1F465}',
  'Duvida sobre qual medicacao': '\u{1F48A}',
  'Como tratar': '\u{1F9ED}',
  'Insatisfacao com tratamento': '\u{274C}',
  'TDAH + Ansiedade': '\u{1F630}',
  'TDAH + Depressao': '\u{1F327}\u{FE0F}',
  'TDAH + TEA': '\u{1F9E9}',
  'Multiplas comorbidades': '\u{1F500}',
  'Maes e pais': '\u{1F469}\u{200D}\u{1F467}',
  'Parceiro querendo': '\u{1F491}',
  'Ninguem ao redor': '\u{1F6AB}',
  'TDAH destruindo carreira': '\u{1F4C9}',
  'Instabilidade profissional': '\u{1F3A2}',
  'Qual carreira': '\u{1F9ED}',
  'Empreendedorismo': '\u{1F680}',
  'Musica de fundo': '\u{1F3B5}',
  'Sugestoes de temas': '\u{1F4A1}',
  'Elogios ao formato': '\u{2B50}',
  'Insonia': '\u{1F319}',
  'Exaustao matinal': '\u{1F634}',
  'Incapacidade de manter rotina': '\u{1F504}',
  'Esquecimentos': '\u{1F4AD}',
  'Acumulacao e bagunca': '\u{1F4E6}',
  'Paralisia em tarefas': '\u{1F9CA}',
  // Segment sub-segments
  'Relacionamentos destruidos': '\u{1F494}',
  'Comorbidades complicam tudo': '\u{1F9E9}',
  'Autoestima destruida': '\u{1F614}',
  'Carreira em colapso': '\u{1F4BC}',
  'Luto do diagnostico tardio': '\u{231B}',
  'Validacao e catarse': '\u{1F62D}',
  'Sintomas no dia a dia': '\u{1F9E0}',
  'Gratidao e reconhecimento': '\u{1F64F}',
  'Perguntas e pedidos de ajuda': '\u{2753}',
  'Regulacao emocional e mascaramento': '\u{1F3AD}',
  'Impacto nos outros': '\u{1F91D}',
  'Se reconhecendo no conteudo': '\u{1FA9E}',
  'Se identificou com os sintomas': '\u{1F914}',
  'Concluindo que tem TDAH': '\u{1F4A1}',
  'Chocado com a revelacao': '\u{1F631}',
  'Reacao emocional ao video': '\u{1F62D}',
  'Relatos de sintomas especificos': '\u{1F9E0}',
  'Familia reconhecendo': '\u{1F46A}',
  'Sofrimento cronico': '\u{1F62A}',
  'Descoberta tardia (40+)': '\u{1F9D3}',
  'Gratidao pelo conteudo': '\u{1F64F}',
  'Vai buscar diagnostico': '\u{1F50D}',
  'Quer diagnostico/profissional': '\u{1F50D}',
  'Sofrendo no trabalho/estudo': '\u{1F4BC}',
  'Desespero e urgencia': '\u{1F198}',
  'Multiplos sintomas acumulados': '\u{1F9E0}',
  'Exaustao e paralisia cronica': '\u{1F62E}\u{200D}\u{1F4A8}',
  'Ninguem entende ou acredita': '\u{1F6AB}',
  'Medicacao nao resolve tudo': '\u{1F48A}',
  'Buscando estrategias complementares': '\u{1F4AA}',
  'Frustracao persistente apesar do tratamento': '\u{1F62E}\u{200D}\u{1F4A8}',
  'Compartilhando o que funciona': '\u{1F91D}',
  'Profissional errou ou negligenciou': '\u{274C}',
  'Tratamento transformou minha vida': '\u{2728}',
  'Diagnostico errado por anos': '\u{1F500}',
  'Se reconhecendo mesmo em tratamento': '\u{1FA9E}',
  'Diagnostico tardio e luto': '\u{231B}',
  'Gratidao pelo canal': '\u{1F64F}',
  'Remedios caros e acesso dificil': '\u{1F4B8}',
  'Elogios e gratidao': '\u{1F31F}',
  'Engajamento ativo (dicas e debates)': '\u{1F4AC}',
  'Superfas com dor ativa': '\u{1F614}',
  'Identificacao e auto-reconhecimento': '\u{1FA9E}',
  'Relatos de sintomas cotidianos': '\u{1F9E0}',
  'Familia e relacionamentos': '\u{1F468}\u{200D}\u{1F469}\u{200D}\u{1F467}',
  'Impacto na carreira': '\u{1F4BC}',
  'Diagnostico e descoberta tardia': '\u{231B}',
  'Perguntas ao Dr. Bruno': '\u{2753}',
  'Humor e auto-ironia': '\u{1F602}',
  'Sono, energia e corpo': '\u{1F4A4}',
  'Medicacao e tratamento': '\u{1F48A}',
  'Comorbidades (TEA, bipolar, etc)': '\u{1F9E9}',
  'Saudade e indiferenca emocional': '\u{2744}\u{FE0F}',
  'Desabafos e reflexoes pessoais': '\u{1F4AD}',
  // Familiar sub-segments
  'Filho(a) diagnosticado(a)': '\u{1F466}',
  'Convivencia dificil': '\u{1F494}',
  'Conjuge reconhecendo TDAH no parceiro': '\u{1F491}',
  'Finalmente entendeu': '\u{1F4A1}',
  'Buscando ajuda/orientacao': '\u{1F50D}',
  // Mae sub-segments
  'Reconhecendo TDAH no filho': '\u{1F469}\u{200D}\u{1F467}',
  'Se reconhecendo como mae TDAH': '\u{1FA9E}',
  'Culpa e julgamento': '\u{1F614}',
  'Descoberta tardia como mae': '\u{231B}',
  'Estrategias e apoio': '\u{1F4AA}',
  // Casado sub-segments
  'Casamento destruido/em crise': '\u{1F494}',
  'Frustracao do(a) conjuge': '\u{1F62E}\u{200D}\u{1F4A8}',
  'TDAH explicou o casamento': '\u{1F4A1}',
  'Conjuge como suporte': '\u{1F91D}',
  'Desabafo e dor no relacionamento': '\u{1F62D}',
  'Outros': '\u{1F4CC}',
};

function getEmoji(sc: any): string {
  // Try parent_value first (method clusters)
  if (CLUSTER_EMOJIS[sc.parent_value]) return CLUSTER_EMOJIS[sc.parent_value];
  // Try matching cluster_name
  for (const [key, emoji] of Object.entries(CLUSTER_EMOJIS)) {
    if (sc.cluster_name?.includes(key)) return emoji;
  }
  return '\u{1F4CC}';
}

export function SubclusterView() {
  const { subclusters, currentValue, currentDimension, fetchSubclusters, drillDown, fetchComments, loading } = useAudienceIntelStore();
  const [segmentInsight, setSegmentInsight] = useState<any>(null);

  useEffect(() => {
    if (!currentValue) return;
    if (currentDimension === 'segment') {
      fetchSubclusters('segmento', currentValue);
      // Fetch segment insight
      fetch(`/api/audience/v2/insights?level=3&dimension=${currentValue}`)
        .then(r => r.json())
        .then(data => { if (data && data.length > 0) setSegmentInsight(data[0]); })
        .catch(() => {});
    } else if (currentValue === 'metodo_testado') {
      fetchSubclusters('metodo_testado', '');
    } else if (['sinal_conteudo', 'sinal_produto', 'sinal_copy'].includes(currentValue)) {
      fetchSubclusters(currentValue, 'forte');
    } else {
      fetchSubclusters('demanda_categoria', currentValue);
    }
  }, [currentValue]);

  if (loading && subclusters.length === 0) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Carregando...</div>;
  }

  if (subclusters.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
        <p>Sub-clusters ainda nao gerados para esta categoria.</p>
      </div>
    );
  }

  const TITLES: Record<string, string> = {
    metodo: 'Metodos Testados pela Audiencia',
    conteudo: 'Oportunidades de Conteudo',
    produto: 'Oportunidades de Produto',
    copy: 'Arsenal de Copy',
  };

  // For segments, find the segment name
  const segmentNames: Record<string, string> = {
    confirmado_perdido: 'Confirmado mas perdido',
    descoberta: 'Descoberta',
    busca_ativa: 'Busca ativa',
    em_tratamento: 'Em tratamento ativo',
    superfa_engajado: 'Superfa engajado',
    familiar: 'Familiar buscando entender',
    mae_filhos: 'Mae com filhos e TDAH',
    casado: 'Casado(a) lidando com TDAH no casal',
  };

  const title = currentDimension === 'segment'
    ? segmentNames[currentValue || ''] || currentValue || ''
    : TITLES[currentDimension || ''] || `Sub-clusters: ${currentValue}`;

  // Sort: "Outros" always last, rest by count desc
  const sorted = [...subclusters].sort((a: any, b: any) => {
    if (a.cluster_name === 'Outros') return 1;
    if (b.cluster_name === 'Outros') return -1;
    return b.count - a.count;
  });

  // Deduplicate: count unique comment IDs across all subclusters
  const allIds = new Set<string>();
  for (const sc of subclusters) {
    if (sc.comment_ids) for (const id of sc.comment_ids) allIds.add(id);
  }
  const uniqueTotal = allIds.size > 0 ? allIds.size : subclusters.reduce((s: number, c: any) => s + c.count, 0);

  return (
    <div>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
        {title} ({uniqueTotal} comentarios)
      </h3>

      {segmentInsight && (
        <div style={{
          background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(240,186,60,0.04) 100%)',
          border: '1px solid var(--accent-gold-light)',
          borderRadius: 14,
          padding: '24px 28px',
          marginBottom: 24,
        }}>
          <h4 style={{ fontSize: 17, fontWeight: 700, color: 'var(--accent-gold-dark)', margin: '0 0 16px', lineHeight: 1.3 }}>
            {segmentInsight.title}
          </h4>
          {segmentInsight.narrative.split('\n\n').map((p: string, i: number) => {
            // Convert **bold** and *italic* markdown
            let html = p
              .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--text-primary)">$1</strong>')
              .replace(/\*([^*]+)\*/g, '<em>$1</em>');
            return (
              <p key={i} style={{
                fontSize: 13.5,
                color: 'var(--text-secondary)',
                lineHeight: 1.8,
                margin: i === segmentInsight.narrative.split('\n\n').length - 1 ? '0' : '0 0 14px',
              }}
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          })}
          {segmentInsight.data_snapshot && (
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 18,
              borderTop: '1px solid var(--border)', paddingTop: 14,
            }}>
              {segmentInsight.data_snapshot.feminino_pct && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-surface)', padding: '5px 12px', borderRadius: 20, fontWeight: 500 }}>
                  {segmentInsight.data_snapshot.feminino_pct}% feminino{segmentInsight.data_snapshot.masculino_pct ? ` / ${segmentInsight.data_snapshot.masculino_pct}% masculino` : ''}
                </span>
              )}
              {segmentInsight.data_snapshot.sentimento_top && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-surface)', padding: '5px 12px', borderRadius: 20, fontWeight: 500 }}>
                  {segmentInsight.data_snapshot.sentimento_top}
                </span>
              )}
              {segmentInsight.data_snapshot.demanda_top && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-surface)', padding: '5px 12px', borderRadius: 20, fontWeight: 500 }}>
                  {segmentInsight.data_snapshot.demanda_top}
                </span>
              )}
              {segmentInsight.data_snapshot.insight_surpresa && (
                <span style={{ fontSize: 11, color: 'var(--accent-gold-dark)', background: 'rgba(240,186,60,0.1)', padding: '5px 12px', borderRadius: 20, fontWeight: 600 }}>
                  {segmentInsight.data_snapshot.insight_surpresa}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {sorted.map((sc: any) => (
          <button
            key={sc.id}
            onClick={async () => {
              if (sc.count > 0) {
                drillDown(5, sc.cluster_name, 'subcluster', sc.id);
                // Fetch comments via dedicated subcluster endpoint
                const res = await fetch(`/api/audience/v2/subclusters/${sc.id}/comments?limit=50`);
                const data = await res.json();
                useAudienceIntelStore.setState({ comments: data, loading: false });
              }
            }}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '16px 20px',
              cursor: sc.count > 0 ? 'pointer' : 'default',
              textAlign: 'left',
              opacity: sc.count > 0 ? 1 : 0.5,
              transition: 'border-color 0.15s',
            }}
            onMouseEnter={e => { if (sc.count > 0) e.currentTarget.style.borderColor = 'var(--accent-gold)'; }}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 22 }}>{getEmoji(sc)}</span>
                <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>{sc.cluster_name}</span>
              </div>
              <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent-gold-dark)', flexShrink: 0, marginLeft: 16 }}>
                {sc.count}
              </span>
            </div>

            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 12px', lineHeight: 1.5 }}>
              {sc.cluster_description}
            </p>

            {sc.example_quotes && sc.example_quotes.length > 0 && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                {sc.example_quotes.slice(0, 2).map((q: string, i: number) => (
                  <div key={i} style={{
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    fontStyle: 'italic',
                    marginBottom: 6,
                    paddingLeft: 12,
                    borderLeft: '2px solid var(--accent-gold-light)',
                    lineHeight: 1.5,
                  }}>
                    &ldquo;{q.slice(0, 150)}{q.length > 150 ? '...' : ''}&rdquo;
                  </div>
                ))}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
