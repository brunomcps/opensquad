import { supabase } from '../db/client.js';

const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY || '';
const VOYAGE_URL = 'https://api.voyageai.com/v1/embeddings';
const MODEL = 'voyage-multilingual-2'; // best for Portuguese, 50M free tokens

/**
 * Generate embeddings for a batch of texts using Voyage AI.
 * Returns array of 1024-dim vectors.
 */
async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (!VOYAGE_API_KEY) throw new Error('VOYAGE_API_KEY not configured');
  if (texts.length === 0) return [];

  // With billing: 300 RPM, 1M TPM — use larger batches
  const BATCH_SIZE = 50;
  const batches: string[][] = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    batches.push(texts.slice(i, i + BATCH_SIZE));
  }

  const allEmbeddings: number[][] = [];

  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b];

    const res = await fetch(VOYAGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VOYAGE_API_KEY}`,
      },
      body: JSON.stringify({
        input: batch,
        model: MODEL,
        input_type: 'document',
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Voyage AI error ${res.status}: ${text.slice(0, 200)}`);
    }

    const json = await res.json();
    const embeddings = json.data.map((d: any) => d.embedding);
    allEmbeddings.push(...embeddings);
  }

  return allEmbeddings;
}

/**
 * Index a video's embedding in Supabase.
 */
async function upsertVideoEmbedding(entry: {
  source: 'bruno' | 'competitor';
  sourceId: string;
  videoId: string;
  platform: string;
  title: string;
  description?: string;
  embedding: number[];
}) {
  const embeddingStr = `[${entry.embedding.join(',')}]`;
  await supabase.from('video_embeddings').upsert({
    source: entry.source,
    source_id: entry.sourceId,
    video_id: entry.videoId,
    platform: entry.platform,
    title: entry.title,
    description: entry.description || null,
    embedding: embeddingStr,
  }, { onConflict: 'source_id,video_id' });
}

/**
 * Index all Bruno's videos (from fichas table).
 */
export async function indexBrunoVideos(): Promise<number> {
  const { data: fichas } = await supabase
    .from('fichas')
    .select('video_id, title');

  if (!fichas || fichas.length === 0) return 0;

  // Check which are already indexed
  const { data: existing } = await supabase
    .from('video_embeddings')
    .select('video_id')
    .eq('source', 'bruno');
  const existingIds = new Set((existing || []).map(e => e.video_id));

  const toIndex = fichas.filter(f => !existingIds.has(f.video_id));
  if (toIndex.length === 0) return 0;

  const texts = toIndex.map(f => f.title || '');
  const embeddings = await generateEmbeddings(texts);

  for (let i = 0; i < toIndex.length; i++) {
    await upsertVideoEmbedding({
      source: 'bruno',
      sourceId: 'bruno',
      videoId: toIndex[i].video_id,
      platform: 'youtube',
      title: toIndex[i].title || '',
      embedding: embeddings[i],
    });
  }

  console.log(`[embeddings] Indexed ${toIndex.length} Bruno videos`);
  return toIndex.length;
}

/**
 * Index all competitor videos (from competitor_platform_data).
 */
export async function indexCompetitorVideos(): Promise<number> {
  const { data: platforms } = await supabase
    .from('competitor_platform_data')
    .select('competitor_id, platform, items');

  if (!platforms) return 0;

  // Check which are already indexed
  const { data: existing } = await supabase
    .from('video_embeddings')
    .select('video_id')
    .eq('source', 'competitor');
  const existingIds = new Set((existing || []).map(e => e.video_id));

  const toIndex: { sourceId: string; videoId: string; platform: string; title: string }[] = [];

  for (const pd of platforms) {
    const items = pd.items || [];
    for (const item of items) {
      if (item.id && item.title && !existingIds.has(item.id)) {
        toIndex.push({
          sourceId: pd.competitor_id,
          videoId: item.id,
          platform: pd.platform,
          title: item.title,
        });
      }
    }
  }

  if (toIndex.length === 0) return 0;

  const texts = toIndex.map(t => t.title);
  const embeddings = await generateEmbeddings(texts);

  for (let i = 0; i < toIndex.length; i++) {
    await upsertVideoEmbedding({
      source: 'competitor',
      sourceId: toIndex[i].sourceId,
      videoId: toIndex[i].videoId,
      platform: toIndex[i].platform,
      title: toIndex[i].title,
      embedding: embeddings[i],
    });
  }

  console.log(`[embeddings] Indexed ${toIndex.length} competitor videos`);
  return toIndex.length;
}

/**
 * Find competitor videos similar to a Bruno video.
 */
export async function findSimilarToVideo(videoId: string, threshold = 0.65, limit = 10) {
  // Get Bruno video embedding
  const { data: brunoEmb } = await supabase
    .from('video_embeddings')
    .select('embedding, title')
    .eq('video_id', videoId)
    .eq('source', 'bruno')
    .single();

  if (!brunoEmb) return [];

  const { data } = await supabase.rpc('match_videos', {
    query_embedding: brunoEmb.embedding,
    match_threshold: threshold,
    match_count: limit,
    filter_source: 'competitor',
  });

  return data || [];
}

/**
 * Content gap analysis using embeddings.
 * For each competitor outlier, check if Bruno has any similar video.
 * If not → gap. If yes but lower views → opportunity.
 */
export async function analyzeContentGaps(similarityThreshold = 0.65): Promise<any[]> {
  // Get all competitor outlier embeddings
  const { data: compEmbeddings } = await supabase
    .from('video_embeddings')
    .select('*')
    .eq('source', 'competitor');

  if (!compEmbeddings || compEmbeddings.length === 0) return [];

  // Get competitor items to check which are outliers
  const { data: platforms } = await supabase
    .from('competitor_platform_data')
    .select('competitor_id, platform, items');

  // Build outlier lookup
  const outlierSet = new Set<string>();
  const videoMeta = new Map<string, any>();
  for (const pd of (platforms || [])) {
    for (const item of (pd.items || [])) {
      if (item.isOutlier) {
        outlierSet.add(item.id);
        videoMeta.set(item.id, { ...item, competitorId: pd.competitor_id, platform: pd.platform });
      }
    }
  }

  // Get competitor registry for names
  const { data: competitors } = await supabase.from('competitors').select('id, name');
  const compNames = new Map((competitors || []).map(c => [c.id, c.name]));

  const insights: any[] = [];
  const processedVideos = new Set<string>();

  for (const ce of compEmbeddings) {
    if (!outlierSet.has(ce.video_id) || processedVideos.has(ce.video_id)) continue;
    processedVideos.add(ce.video_id);

    const meta = videoMeta.get(ce.video_id);
    if (!meta) continue;

    // Find most similar Bruno video
    const { data: matches } = await supabase.rpc('match_videos', {
      query_embedding: ce.embedding,
      match_threshold: similarityThreshold,
      match_count: 1,
      filter_source: 'bruno',
    });

    const compName = compNames.get(ce.source_id) || ce.source_id;

    if (!matches || matches.length === 0) {
      // GAP: No similar Bruno video
      insights.push({
        type: 'gap',
        topic: ce.title,
        description: `${compName} viralizou com este tema e Bruno não tem vídeo similar`,
        competitorData: [{
          competitorId: ce.source_id,
          competitorName: compName,
          videoTitle: meta.title,
          views: meta.views,
          zScore: meta.zScore,
          url: meta.url,
        }],
      });
    } else {
      // Has similar video — check if it's an opportunity (competitor did much better)
      const brunoMatch = matches[0];
      // Get Bruno's views from fichas or yt-analytics
      const { data: brunoFicha } = await supabase
        .from('fichas')
        .select('title')
        .eq('video_id', brunoMatch.video_id)
        .single();

      insights.push({
        type: 'overlap',
        topic: ce.title,
        similarity: brunoMatch.similarity,
        description: `Tema similar: "${brunoMatch.title}" (similaridade ${(brunoMatch.similarity * 100).toFixed(0)}%)`,
        competitorData: [{
          competitorId: ce.source_id,
          competitorName: compName,
          videoTitle: meta.title,
          views: meta.views,
          zScore: meta.zScore,
          url: meta.url,
        }],
        brunoData: {
          videoTitle: brunoFicha?.title || brunoMatch.title,
          views: null,
          url: `https://www.youtube.com/watch?v=${brunoMatch.video_id}`,
        },
      });
    }
  }

  // Sort: gaps first
  insights.sort((a, b) => {
    if (a.type === 'gap' && b.type !== 'gap') return -1;
    if (b.type === 'gap' && a.type !== 'gap') return 1;
    return 0;
  });

  return insights;
}

/**
 * Run full embedding pipeline: index all videos + analyze gaps.
 */
export async function runEmbeddingPipeline(): Promise<{
  brunoIndexed: number;
  competitorIndexed: number;
  insights: any[];
}> {
  const brunoIndexed = await indexBrunoVideos();
  const competitorIndexed = await indexCompetitorVideos();
  const insights = await analyzeContentGaps();
  return { brunoIndexed, competitorIndexed, insights };
}
