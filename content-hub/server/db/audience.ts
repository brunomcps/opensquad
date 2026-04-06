import { supabase } from './client.js';

// ============================================================
// Comments
// ============================================================

export interface CommentFilters {
  tipo?: string;
  sentimento?: string;
  sinal_conteudo?: string;
  sinal_produto?: string;
  sinal_copy?: string;
  sinal_metodo?: string;
  categoria?: string;
  video_id?: string;
  perfil_genero?: string;
  perfil_diagnostico?: string;
  perfil_faixa_etaria?: string;
  min_likes?: number;
  min_peso_social?: number;
  is_superfan?: boolean;
  exclude_team?: boolean;
  exclude_channel_owner?: boolean;
  search?: string;
  elogio_tipo?: string;
  tem_demanda?: boolean;
  comment_ids?: string[];
  author_channel_url?: string;
  sort?: 'peso_social' | 'likes' | 'recent';
  limit?: number;
  offset?: number;
}

export async function getAudComments(filters: CommentFilters = {}) {
  let query = supabase.from('aud_comments').select('*', { count: 'exact' });

  // Boolean/equality filters
  if (filters.tipo) query = query.eq('tipo', filters.tipo);
  if (filters.sentimento) query = query.eq('sentimento_geral', filters.sentimento);
  if (filters.sinal_conteudo) query = query.eq('sinal_conteudo', filters.sinal_conteudo);
  if (filters.sinal_produto) query = query.eq('sinal_produto', filters.sinal_produto);
  if (filters.sinal_copy) query = query.eq('sinal_copy', filters.sinal_copy);
  if (filters.sinal_metodo) query = query.eq('sinal_metodo', filters.sinal_metodo);
  if (filters.video_id) query = query.eq('video_id', filters.video_id);
  if (filters.perfil_genero) query = query.eq('perfil_genero', filters.perfil_genero);
  if (filters.perfil_diagnostico) query = query.eq('perfil_diagnostico', filters.perfil_diagnostico);
  if (filters.perfil_faixa_etaria) query = query.eq('perfil_faixa_etaria', filters.perfil_faixa_etaria);
  if (filters.elogio_tipo) query = query.eq('elogio_tipo', filters.elogio_tipo);
  if (filters.tem_demanda !== undefined) query = query.eq('tem_demanda', filters.tem_demanda);
  if (filters.exclude_team !== false) query = query.eq('is_team', false);
  if (filters.exclude_channel_owner !== false) query = query.eq('is_channel_owner', false);
  if (filters.min_likes) query = query.gte('like_count', filters.min_likes);
  if (filters.min_peso_social) query = query.gte('peso_social', filters.min_peso_social);
  if (filters.search) query = query.ilike('text', `%${filters.search}%`);
  if (filters.comment_ids && filters.comment_ids.length > 0) query = query.in('id', filters.comment_ids);
  if (filters.author_channel_url) query = query.eq('author_channel_url', filters.author_channel_url);

  // Sort
  const sort = filters.sort || 'peso_social';
  if (sort === 'peso_social') query = query.order('peso_social', { ascending: false });
  else if (sort === 'likes') query = query.order('like_count', { ascending: false });
  else if (sort === 'recent') query = query.order('published_at', { ascending: false });

  // Pagination
  const limit = Math.min(filters.limit || 50, 200);
  const offset = filters.offset || 0;
  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) throw new Error(`getAudComments: ${error.message}`);
  return { items: data || [], total: count || 0 };
}

export async function getAudCommentById(id: string) {
  const { data, error } = await supabase.from('aud_comments').select('*').eq('id', id).single();
  if (error) throw new Error(`getAudCommentById: ${error.message}`);
  // Also fetch demandas for this comment
  const { data: demandas } = await supabase.from('aud_demandas').select('*').eq('comment_id', id);
  return { ...data, demandas: demandas || [] };
}

// Filter by superfan: comments from authors who are superfans
export async function getSuperfanCommentIds(): Promise<Set<string>> {
  const { data } = await supabase.from('aud_superfans')
    .select('author_channel_url')
    .eq('is_superfan', true)
    .eq('is_team', false);
  return new Set((data || []).map(d => d.author_channel_url));
}

// ============================================================
// Demandas
// ============================================================

export async function getAudDemandas(filters: { categoria?: string; tipo?: string; video_id?: string } = {}) {
  let query = supabase.from('aud_demandas').select(`
    *,
    aud_comments!inner(video_id, video_title, author_name, peso_social, sentimento_geral, tipo, is_team, is_channel_owner, text, like_count)
  `);

  if (filters.categoria) query = query.eq('categoria', filters.categoria);
  if (filters.tipo) query = query.eq('tipo', filters.tipo);
  if (filters.video_id) query = query.eq('aud_comments.video_id', filters.video_id);

  query = query.eq('aud_comments.is_team', false).eq('aud_comments.is_channel_owner', false);

  const { data, error } = await query;
  if (error) throw new Error(`getAudDemandas: ${error.message}`);
  return data || [];
}

// ============================================================
// Videos
// ============================================================

export async function getAudVideos() {
  const { data, error } = await supabase.from('aud_videos').select('*').order('views', { ascending: false });
  if (error) throw new Error(`getAudVideos: ${error.message}`);
  return data || [];
}

// ============================================================
// Superfans
// ============================================================

export async function getAudSuperfans(limit = 200, offset = 0) {
  const { data, count, error } = await supabase.from('aud_superfans')
    .select('*', { count: 'exact' })
    .eq('is_superfan', true)
    .eq('is_team', false)
    .order('total_peso_social', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw new Error(`getAudSuperfans: ${error.message}`);
  return { items: data || [], total: count || 0 };
}

export async function getAudSuperfanProfile(authorUrl: string) {
  const { data, error } = await supabase.from('aud_superfans')
    .select('*')
    .eq('author_channel_url', authorUrl)
    .single();
  if (error) throw new Error(`getAudSuperfanProfile: ${error.message}`);
  return data;
}

// ============================================================
// Subclusters
// ============================================================

export async function getAudSubclusters(dimension?: string, parentValue?: string) {
  let query = supabase.from('aud_subclusters').select('*');
  if (dimension) query = query.eq('dimension', dimension);
  if (parentValue) query = query.eq('parent_value', parentValue);
  query = query.order('count', { ascending: false });
  const { data, error } = await query;
  if (error) throw new Error(`getAudSubclusters: ${error.message}`);
  return data || [];
}

export async function saveAudSubclusters(clusters: any[]) {
  // Delete existing for same dimension/parent
  if (clusters.length > 0) {
    await supabase.from('aud_subclusters')
      .delete()
      .eq('dimension', clusters[0].dimension)
      .eq('parent_value', clusters[0].parent_value);
  }
  const { error } = await supabase.from('aud_subclusters').insert(clusters);
  if (error) throw new Error(`saveAudSubclusters: ${error.message}`);
}

// ============================================================
// Insights
// ============================================================

export async function getAudInsights(level?: number, dimension?: string) {
  let query = supabase.from('aud_insights').select('*');
  if (level !== undefined) query = query.eq('level', level);
  if (dimension) query = query.eq('dimension', dimension);
  query = query.order('generated_at', { ascending: false });
  const { data, error } = await query;
  if (error) throw new Error(`getAudInsights: ${error.message}`);
  return data || [];
}

export async function saveAudInsights(insights: any[]) {
  const { error } = await supabase.from('aud_insights').insert(insights);
  if (error) throw new Error(`saveAudInsights: ${error.message}`);
}

// ============================================================
// Aggregations (for charts/stats)
// ============================================================

export async function getAudAggregation(column: string) {
  // Paginate to get ALL rows (Supabase default limit is 1000)
  const counts: Record<string, number> = {};
  let offset = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('aud_comments')
      .select(column)
      .eq('is_team', false)
      .eq('is_channel_owner', false)
      .range(offset, offset + PAGE - 1);

    if (error) throw new Error(`getAudAggregation: ${error.message}`);
    if (!data || data.length === 0) break;

    for (const row of data) {
      const val = (row as any)[column];
      if (val !== null && val !== undefined) {
        const key = String(val);
        counts[key] = (counts[key] || 0) + 1;
      }
    }

    if (data.length < PAGE) break;
    offset += PAGE;
  }

  return Object.entries(counts)
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);
}
