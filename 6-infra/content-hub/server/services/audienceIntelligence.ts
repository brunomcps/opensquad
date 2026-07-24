import {
  getAudComments,
  getAudCommentById,
  getAudDemandas,
  getAudVideos,
  getAudSuperfans,
  getAudSubclusters,
  getAudInsights,
  getAudAggregation,
  getSuperfanCommentIds,
  type CommentFilters,
} from '../db/audience.js';
import { supabase } from '../db/client.js';

// ============================================================
// Stats (Level 3 overview)
// ============================================================

let statsCache: { data: any; ts: number } | null = null;
const CACHE_TTL = 10 * 60 * 1000; // 10 min (data changes rarely)

export async function getStats() {
  if (statsCache && Date.now() - statsCache.ts < CACHE_TTL) return statsCache.data;

  const [tipos, sentimentos, sinais_conteudo, sinais_produto, sinais_copy, sinais_metodo] = await Promise.all([
    getAudAggregation('tipo'),
    getAudAggregation('sentimento_geral'),
    getAudAggregation('sinal_conteudo'),
    getAudAggregation('sinal_produto'),
    getAudAggregation('sinal_copy'),
    getAudAggregation('sinal_metodo'),
  ]);

  // Total counts
  const { count: totalComments } = await supabase.from('aud_comments').select('*', { count: 'exact', head: true });
  const { count: publicComments } = await supabase.from('aud_comments').select('*', { count: 'exact', head: true }).eq('is_channel_owner', false).eq('is_team', false);
  const { count: withDemand } = await supabase.from('aud_comments').select('*', { count: 'exact', head: true }).eq('tem_demanda', true).eq('is_team', false).eq('is_channel_owner', false);
  const { count: totalDemandas } = await supabase.from('aud_demandas').select('*', { count: 'exact', head: true });
  const { count: superfanCount } = await supabase.from('aud_superfans').select('*', { count: 'exact', head: true }).eq('is_superfan', true).eq('is_team', false);
  const { count: videoCount } = await supabase.from('aud_videos').select('*', { count: 'exact', head: true });

  const data = {
    total_comments: totalComments || 0,
    public_comments: publicComments || 0,
    with_demand: withDemand || 0,
    demand_rate: publicComments ? Math.round((withDemand || 0) / publicComments * 1000) / 10 : 0,
    total_demandas: totalDemandas || 0,
    superfan_count: superfanCount || 0,
    video_count: videoCount || 0,
    tipos,
    sentimentos,
    sinais: { conteudo: sinais_conteudo, produto: sinais_produto, copy: sinais_copy, metodo: sinais_metodo },
  };

  statsCache = { data, ts: Date.now() };
  return data;
}

// ============================================================
// Dimension detail (Level 3 per dimension)
// ============================================================

export async function getDimensionData(dimension: string) {
  switch (dimension) {
    case 'demandas': {
      // Paginate to get ALL demandas
      const cats: Record<string, { total: number; explicitas: number; implicitas: number }> = {};
      let offset = 0;
      const PAGE = 1000;
      while (true) {
        const { data } = await supabase.from('aud_demandas').select('categoria, tipo').range(offset, offset + PAGE - 1);
        if (!data || data.length === 0) break;
        for (const d of data) {
          if (!cats[d.categoria]) cats[d.categoria] = { total: 0, explicitas: 0, implicitas: 0 };
          cats[d.categoria].total++;
          if (d.tipo === 'explicita') cats[d.categoria].explicitas++;
          else cats[d.categoria].implicitas++;
        }
        if (data.length < PAGE) break;
        offset += PAGE;
      }
      return Object.entries(cats)
        .map(([categoria, stats]) => ({ categoria, ...stats }))
        .sort((a, b) => b.total - a.total);
    }

    case 'conteudo':
      return getAudAggregation('sinal_conteudo');

    case 'produto':
      return getAudAggregation('sinal_produto');

    case 'copy':
      return getAudAggregation('sinal_copy');

    case 'metodo':
      return getAudAggregation('sinal_metodo');

    case 'perfil': {
      const [genero, faixa_etaria, diagnostico, em_tratamento, profissao, localizacao] = await Promise.all([
        getAudAggregation('perfil_genero'),
        getAudAggregation('perfil_faixa_etaria'),
        getAudAggregation('perfil_diagnostico'),
        getAudAggregation('perfil_em_tratamento'),
        getAudAggregation('perfil_profissao'),
        getAudAggregation('perfil_localizacao'),
      ]);

      // Cross-tabulation gênero × diagnóstico
      const crossData: any[] = [];
      let offset = 0;
      const PAGE = 1000;
      while (true) {
        const { data } = await supabase.from('aud_comments')
          .select('perfil_genero, perfil_diagnostico')
          .eq('is_team', false).eq('is_channel_owner', false)
          .not('perfil_genero', 'is', null)
          .not('perfil_diagnostico', 'is', null)
          .range(offset, offset + PAGE - 1);
        if (!data || data.length === 0) break;
        crossData.push(...data);
        if (data.length < PAGE) break;
        offset += PAGE;
      }
      const cross: Record<string, Record<string, number>> = {};
      for (const row of crossData) {
        if (!cross[row.perfil_genero]) cross[row.perfil_genero] = {};
        cross[row.perfil_genero][row.perfil_diagnostico] = (cross[row.perfil_genero][row.perfil_diagnostico] || 0) + 1;
      }

      return { genero, faixa_etaria, diagnostico, em_tratamento, profissao, localizacao, genero_diagnostico: cross };
    }

    case 'tipo_sentimento': {
      // Paginated cross-tabulation of tipo × sentimento
      const matrix: Record<string, Record<string, number>> = {};
      let offset = 0;
      const PAGE = 1000;
      while (true) {
        const { data } = await supabase.from('aud_comments')
          .select('tipo, sentimento_geral')
          .eq('is_team', false)
          .eq('is_channel_owner', false)
          .range(offset, offset + PAGE - 1);
        if (!data || data.length === 0) break;
        for (const row of data) {
          if (!row.tipo || !row.sentimento_geral) continue;
          if (!matrix[row.tipo]) matrix[row.tipo] = {};
          matrix[row.tipo][row.sentimento_geral] = (matrix[row.tipo][row.sentimento_geral] || 0) + 1;
        }
        if (data.length < PAGE) break;
        offset += PAGE;
      }
      return matrix;
    }

    case 'prova_social': {
      // Elogios qualificados com impacto
      const { data } = await supabase.from('aud_comments')
        .select('id, author_name, video_title, impacto_descrito, peso_social, like_count, text')
        .eq('elogio_tipo', 'qualificado')
        .eq('is_team', false)
        .not('impacto_descrito', 'is', null)
        .order('peso_social', { ascending: false })
        .limit(100);
      return data || [];
    }

    case 'videos': {
      return getAudVideos();
    }

    default:
      throw new Error(`Unknown dimension: ${dimension}`);
  }
}

// ============================================================
// Cross-tabulation (any 2 dimensions)
// ============================================================

export async function getCrossTabulation(dim1: string, dim2: string) {
  const { data } = await supabase.from('aud_comments')
    .select(`${dim1}, ${dim2}`)
    .eq('is_team', false)
    .eq('is_channel_owner', false);

  const matrix: Record<string, Record<string, number>> = {};
  for (const row of data || []) {
    const v1 = (row as any)[dim1];
    const v2 = (row as any)[dim2];
    if (!v1 || !v2) continue;
    if (!matrix[v1]) matrix[v1] = {};
    matrix[v1][v2] = (matrix[v1][v2] || 0) + 1;
  }
  return matrix;
}

// ============================================================
// Comments (with superfan filter support)
// ============================================================

export async function searchComments(filters: CommentFilters) {
  if (filters.is_superfan) {
    // Get superfan URLs first, then filter comments
    const superfanUrls = await getSuperfanCommentIds();
    const result = await getAudComments({ ...filters, is_superfan: undefined });
    const filtered = result.items.filter(c => superfanUrls.has(c.author_channel_url));
    return { items: filtered, total: filtered.length };
  }
  return getAudComments(filters);
}

export async function getCommentDetail(id: string) {
  return getAudCommentById(id);
}

// ============================================================
// Superfans
// ============================================================

export { getAudSuperfans as getSuperfans } from '../db/audience.js';

// ============================================================
// Subclusters & Insights (pass-through)
// ============================================================

export { getAudSubclusters as getSubclusters } from '../db/audience.js';
export { getAudInsights as getInsights } from '../db/audience.js';

// ============================================================
// Audience Segments (3 layers) — with IDs and backend queries
// ============================================================

interface SegmentDef {
  id: string;
  layer: string;
  emoji: string;
  name: string;
  description: string;
  // buildQuery applies all filters on the backend — no leaky abstractions
  buildQuery: (base: any) => any;
}

const BASE_FILTERS = (q: any) => q.eq('is_team', false).eq('is_channel_owner', false);

export const SEGMENT_DEFS: SegmentDef[] = [
  // Layer 1: Jornada
  { id: 'descoberta', layer: 'jornada', emoji: '\u{1F50D}', name: 'Descoberta — "sera que eu tenho?"',
    description: 'Suspeita de TDAH, sentimento de identificacao. No limbo entre suspeita e acao.',
    buildQuery: q => BASE_FILTERS(q).eq('perfil_diagnostico', 'suspeita').eq('sentimento_geral', 'identificacao') },
  { id: 'busca_ativa', layer: 'jornada', emoji: '\u{1F198}', name: 'Busca ativa (frustrados querendo solucao)',
    description: 'Suspeita com frustracao. Buscando ativamente ajuda e direcao.',
    buildQuery: q => BASE_FILTERS(q).eq('perfil_diagnostico', 'suspeita').eq('sentimento_geral', 'frustracao') },
  { id: 'confirmado_perdido', layer: 'jornada', emoji: '\u{1F9ED}', name: 'Confirmado mas perdido',
    description: 'Diagnostico confirmado, nao em tratamento. Sabe que tem mas nao sabe o que fazer.',
    buildQuery: q => BASE_FILTERS(q).eq('perfil_diagnostico', 'confirmado').or('perfil_em_tratamento.is.null,perfil_em_tratamento.eq.false') },
  { id: 'em_tratamento', layer: 'jornada', emoji: '\u{1F48A}', name: 'Em tratamento ativo',
    description: 'Em tratamento mas frustracao ainda lidera. Tratamento nao elimina a dor.',
    buildQuery: q => BASE_FILTERS(q).eq('perfil_em_tratamento', true) },
  { id: 'superfa_engajado', layer: 'jornada', emoji: '\u{2B50}', name: 'Engajado/estabilizado (superfa)',
    description: 'Superfas com sentimento neutro. Processaram o choque inicial.',
    buildQuery: q => q }, // handled specially
  // Layer 2: Papel
  { id: 'familiar', layer: 'papel', emoji: '\u{1F469}\u{200D}\u{1F467}', name: 'Familiar buscando entender',
    description: 'Maes, pais, parceiros que assistem pra entender a pessoa com TDAH.',
    buildQuery: q => q }, // handled via demandas
  { id: 'mae_filhos', layer: 'papel', emoji: '\u{1F469}\u{200D}\u{1F37C}', name: 'Mae com filhos e TDAH',
    description: 'Mulheres com filhos que mencionam TDAH na parentalidade.',
    buildQuery: q => BASE_FILTERS(q).eq('perfil_genero', 'feminino').eq('perfil_filhos', true) },
  { id: 'casado', layer: 'papel', emoji: '\u{1F491}', name: 'Casado(a) lidando com TDAH no casal',
    description: 'Pessoas casadas navegando TDAH no relacionamento conjugal.',
    buildQuery: q => BASE_FILTERS(q).ilike('perfil_estado_civil', '%casad%') },
  // Layer 3: Profissao
  { id: 'prof_professor', layer: 'profissao', emoji: '\u{1F469}\u{200D}\u{1F3EB}', name: 'Professoras',
    description: 'Maioria com suspeita — se reconhecem nos alunos. Sentimento: identificacao.',
    buildQuery: q => BASE_FILTERS(q).ilike('perfil_profissao', '%professor%') },
  { id: 'prof_psicologo', layer: 'profissao', emoji: '\u{1F9E0}', name: 'Psicologas/os',
    description: 'Maioria confirmado. Profissionais que se reconhecem. Sentimento: neutro.',
    buildQuery: q => BASE_FILTERS(q).ilike('perfil_profissao', '%psicolog%') },
  { id: 'prof_advogado', layer: 'profissao', emoji: '\u{2696}\u{FE0F}', name: 'Advogadas/os',
    description: 'Diagnostico confirmado, prazos + perfeccionismo. Sentimento: frustracao.',
    buildQuery: q => BASE_FILTERS(q).ilike('perfil_profissao', '%advogad%') },
  { id: 'prof_programador', layer: 'profissao', emoji: '\u{1F468}\u{200D}\u{1F4BB}', name: 'Programadores/TI',
    description: 'Diagnostico confirmado, buscam sistemas. Sentimento: neutro.',
    buildQuery: q => BASE_FILTERS(q).ilike('perfil_profissao', '%programador%') },
  { id: 'prof_medico', layer: 'profissao', emoji: '\u{1FA7A}', name: 'Medicos',
    description: 'Diagnostico confirmado. Sentimento predominante: raiva.',
    buildQuery: q => BASE_FILTERS(q).ilike('perfil_profissao', '%medic%') },
  { id: 'prof_militar', layer: 'profissao', emoji: '\u{1F396}\u{FE0F}', name: 'Militares',
    description: 'Suspeita, rigidez institucional + TDAH. Sentimento: identificacao.',
    buildQuery: q => BASE_FILTERS(q).ilike('perfil_profissao', '%militar%') },
];

let segmentsCache: { data: any; ts: number } | null = null;

export async function getAudienceSegments() {
  if (segmentsCache && Date.now() - segmentsCache.ts < CACHE_TTL) return segmentsCache.data;

  const results: any[] = [];

  for (const seg of SEGMENT_DEFS) {
    // Special: superfan
    if (seg.id === 'superfa_engajado') {
      const { count } = await supabase.from('aud_superfans')
        .select('*', { count: 'exact', head: true })
        .eq('is_superfan', true).eq('is_team', false);
      results.push({ id: seg.id, layer: seg.layer, emoji: seg.emoji, name: seg.name, description: seg.description, count: count || 0 });
      continue;
    }

    // Special: familiar (via demandas)
    if (seg.id === 'familiar') {
      const { count } = await supabase.from('aud_demandas')
        .select('*', { count: 'exact', head: true })
        .eq('categoria', 'psicoeducacao_terceiros');
      results.push({ id: seg.id, layer: seg.layer, emoji: seg.emoji, name: seg.name, description: seg.description, count: count || 0 });
      continue;
    }

    // Standard: use buildQuery for count
    const query = seg.buildQuery(supabase.from('aud_comments').select('*', { count: 'exact', head: true }));
    const { count } = await query;
    results.push({ id: seg.id, layer: seg.layer, emoji: seg.emoji, name: seg.name, description: seg.description, count: count || 0 });
  }

  segmentsCache = { data: results, ts: Date.now() };
  return results;
}

// Get comments for a specific segment by ID
export async function getSegmentComments(segmentId: string, limit = 50, offset = 0) {
  const seg = SEGMENT_DEFS.find(s => s.id === segmentId);
  if (!seg) throw new Error(`Segment not found: ${segmentId}`);

  // Special: superfan
  if (seg.id === 'superfa_engajado') {
    const { data: fans } = await supabase.from('aud_superfans')
      .select('author_channel_url').eq('is_superfan', true).eq('is_team', false);
    const urls = (fans || []).map(f => f.author_channel_url);
    // Get comments from these authors
    const { data, count } = await supabase.from('aud_comments')
      .select('*', { count: 'exact' })
      .in('author_channel_url', urls.slice(0, 200)) // Supabase IN limit
      .eq('is_team', false)
      .order('peso_social', { ascending: false })
      .range(offset, offset + limit - 1);
    return { items: data || [], total: count || 0 };
  }

  // Special: familiar (via demandas)
  if (seg.id === 'familiar') {
    const { data: demandas } = await supabase.from('aud_demandas')
      .select('comment_id').eq('categoria', 'psicoeducacao_terceiros');
    const ids = [...new Set((demandas || []).map(d => d.comment_id))];
    const { data, count } = await supabase.from('aud_comments')
      .select('*', { count: 'exact' })
      .in('id', ids.slice(0, 200))
      .order('peso_social', { ascending: false })
      .range(offset, offset + limit - 1);
    return { items: data || [], total: count || 0 };
  }

  // Standard: use buildQuery
  const query = seg.buildQuery(supabase.from('aud_comments').select('*', { count: 'exact' }))
    .order('peso_social', { ascending: false })
    .range(offset, offset + limit - 1);
  const { data, count } = await query;
  return { items: data || [], total: count || 0 };
}

// ============================================================
// Dimension summary cards (Level 2)
// ============================================================

export async function getDimensionSummaries() {
  const stats = await getStats();

  const forteCount = (arr: any[]) => arr.find((a: any) => a.value === 'forte')?.count || 0;

  // Get top demand category
  const demandData = await getDimensionData('demandas') as any[];
  const topDemanda = demandData[0]?.categoria || '-';

  // Get top copy phrase
  const { data: topCopy } = await supabase.from('aud_comments')
    .select('linguagem_exata, peso_social')
    .eq('sinal_copy', 'forte')
    .eq('is_team', false)
    .order('peso_social', { ascending: false })
    .limit(1);
  const topPhrase = topCopy?.[0]?.linguagem_exata?.[0] || '-';

  return [
    {
      key: 'demandas',
      label: 'Demandas',
      metric: stats.total_demandas,
      subtitle: `Top: ${topDemanda}`,
      detail: `${stats.demand_rate}% dos comentários`,
    },
    {
      key: 'conteudo',
      label: 'Oportunidades de Conteúdo',
      metric: forteCount(stats.sinais.conteudo),
      subtitle: 'sinais fortes',
      detail: 'Sugestões de vídeos',
    },
    {
      key: 'produto',
      label: 'Oportunidades de Produto',
      metric: forteCount(stats.sinais.produto),
      subtitle: 'sinais fortes',
      detail: 'Ideias de produtos escaláveis',
    },
    {
      key: 'copy',
      label: 'Arsenal de Copy',
      metric: forteCount(stats.sinais.copy),
      subtitle: 'sinais fortes',
      detail: topPhrase.slice(0, 50),
    },
    {
      key: 'metodo',
      label: 'Métodos Testados',
      metric: forteCount(stats.sinais.metodo),
      subtitle: 'sinais fortes',
      detail: 'O que a audiência já tentou',
    },
    {
      key: 'perfil',
      label: 'Perfil da Audiência',
      metric: stats.public_comments,
      subtitle: 'comentários públicos',
      detail: `${stats.superfan_count} superfãs`,
    },
    {
      key: 'tipo_sentimento',
      label: 'Jornada Emocional',
      metric: stats.sentimentos.length,
      subtitle: 'sentimentos detectados',
      detail: `Top: ${stats.sentimentos[0]?.value || '-'}`,
    },
    {
      key: 'prova_social',
      label: 'Prova Social',
      metric: stats.tipos.find((t: any) => t.value === 'elogio')?.count || 0,
      subtitle: 'elogios',
      detail: 'Impactos reais documentados',
    },
    {
      key: 'videos',
      label: 'Por Vídeo',
      metric: stats.video_count,
      subtitle: 'vídeos analisados',
      detail: 'Métricas YouTube × comentários',
    },
    {
      key: 'sintomas',
      label: 'Mapa de Sintomas',
      metric: 1923,
      subtitle: 'comentários com sintomas',
      detail: '20 sintomas mapeados + co-ocorrências',
    },
  ];
}
