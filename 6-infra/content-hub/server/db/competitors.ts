import { supabase } from './client.js';

// -- Registry --
export async function getCompetitorRegistry() {
  const { data } = await supabase.from('competitors').select('*');
  return {
    competitors: (data || []).map(c => ({
      id: c.id,
      name: c.name,
      niche: c.niche,
      region: c.region,
      platforms: c.platforms,
    })),
    updatedAt: data?.[0]?.updated_at || '',
  };
}

export async function saveCompetitorRegistry(competitors: any[]) {
  const rows = competitors.map(c => ({
    id: c.id,
    name: c.name,
    niche: c.niche,
    region: c.region,
    platforms: c.platforms,
    updated_at: new Date().toISOString(),
  }));
  await supabase.from('competitors').upsert(rows, { onConflict: 'id' });
}

// -- Platform data --
export async function getCompetitorPlatformData(competitorId: string, platform: string) {
  const { data } = await supabase
    .from('competitor_platform_data')
    .select('*')
    .eq('competitor_id', competitorId)
    .eq('platform', platform)
    .single();
  if (!data) return null;
  return {
    competitorId: data.competitor_id,
    platform: data.platform,
    profile: data.profile,
    items: data.items,
    syncedAt: data.synced_at,
    source: data.source,
    actorId: data.actor_id,
    itemCount: data.item_count,
  };
}

export async function saveCompetitorPlatformData(competitorId: string, platform: string, payload: any) {
  await supabase.from('competitor_platform_data').upsert({
    competitor_id: competitorId,
    platform,
    profile: payload.profile || {},
    items: payload.items || [],
    synced_at: payload.syncedAt || new Date().toISOString(),
    source: payload.source || 'apify',
    actor_id: payload.actorId,
    item_count: payload.itemCount || (payload.items || []).length,
  }, { onConflict: 'competitor_id,platform' });
}

// -- History --
export async function getCompetitorHistory(competitorId: string, platform: string) {
  const { data } = await supabase
    .from('competitor_history')
    .select('*')
    .eq('competitor_id', competitorId)
    .eq('platform', platform)
    .order('synced_at', { ascending: false });
  return (data || []).map(h => ({
    syncedAt: h.synced_at,
    followers: h.followers,
    itemCount: h.item_count,
    outlierCount: h.outlier_count,
    flopCount: h.flop_count,
  }));
}

export async function addCompetitorHistoryEntry(competitorId: string, platform: string, entry: any) {
  await supabase.from('competitor_history').insert({
    competitor_id: competitorId,
    platform,
    synced_at: entry.syncedAt || new Date().toISOString(),
    followers: entry.followers,
    item_count: entry.itemCount,
    outlier_count: entry.outlierCount,
    flop_count: entry.flopCount,
  });
}

// -- Transcripts --
export async function getCompetitorTranscript(competitorId: string, videoId: string) {
  const { data } = await supabase
    .from('competitor_transcripts')
    .select('*')
    .eq('competitor_id', competitorId)
    .eq('video_id', videoId)
    .single();
  if (!data) return null;
  return {
    videoId: data.video_id,
    competitorId: data.competitor_id,
    platform: data.platform,
    text: data.text,
    segments: data.segments,
    method: data.method,
    duration: data.duration,
    savedAt: data.saved_at,
  };
}

export async function saveCompetitorTranscript(entry: {
  competitorId: string;
  videoId: string;
  platform: string;
  text: string;
  segments?: any[];
  method: string;
  duration?: number | null;
}) {
  await supabase.from('competitor_transcripts').upsert({
    competitor_id: entry.competitorId,
    video_id: entry.videoId,
    platform: entry.platform,
    text: entry.text,
    segments: entry.segments || [],
    method: entry.method,
    duration: entry.duration || null,
    saved_at: new Date().toISOString(),
  }, { onConflict: 'competitor_id,video_id' });
}

// -- Comments --
export async function getCompetitorComments(competitorId: string, videoId: string) {
  const { data } = await supabase
    .from('competitor_comments')
    .select('*')
    .eq('competitor_id', competitorId)
    .eq('video_id', videoId)
    .single();
  if (!data) return null;
  return {
    videoId: data.video_id,
    fetchedAt: data.fetched_at,
    totalComments: data.total_comments,
    comments: data.comments,
  };
}

export async function saveCompetitorComments(entry: {
  competitorId: string;
  videoId: string;
  fetchedAt?: string;
  totalComments: number;
  comments: any[];
}) {
  await supabase.from('competitor_comments').upsert({
    competitor_id: entry.competitorId,
    video_id: entry.videoId,
    fetched_at: entry.fetchedAt || new Date().toISOString(),
    total_comments: entry.totalComments,
    comments: entry.comments,
  }, { onConflict: 'competitor_id,video_id' });
}

// -- Competitor Fichas --
export async function getCompetitorFicha(competitorId: string, videoId: string) {
  const { data } = await supabase
    .from('competitor_fichas')
    .select('*')
    .eq('competitor_id', competitorId)
    .eq('video_id', videoId)
    .single();
  if (!data) return null;
  return {
    competitorId: data.competitor_id,
    videoId: data.video_id,
    platform: data.platform,
    title: data.title,
    durationText: data.duration_text,
    durationSeconds: data.duration_seconds,
    publishedAt: data.published_at,
    structureType: data.structure_type,
    proportions: data.proportions,
    hookElementCount: data.hook_element_count,
    blockCount: data.block_count,
    blocks: data.blocks,
    sections: data.sections,
    summary: data.summary || null,
    generatedAt: data.generated_at,
  };
}

export async function getCompetitorFichas(competitorId?: string) {
  let query = supabase
    .from('competitor_fichas')
    .select('competitor_id, video_id, platform, title, duration_text, duration_seconds, published_at, structure_type, proportions, hook_element_count, block_count, generated_at')
    .order('generated_at', { ascending: false });
  if (competitorId) query = query.eq('competitor_id', competitorId);
  const { data } = await query;
  return (data || []).map(f => ({
    competitorId: f.competitor_id,
    videoId: f.video_id,
    platform: f.platform,
    title: f.title,
    durationText: f.duration_text,
    durationSeconds: f.duration_seconds,
    publishedAt: f.published_at,
    structureType: f.structure_type,
    proportions: f.proportions,
    hookElementCount: f.hook_element_count,
    blockCount: f.block_count,
    sectionCount: 0, // computed client-side
    generatedAt: f.generated_at,
  }));
}

export async function saveCompetitorFicha(ficha: {
  competitorId: string;
  videoId: string;
  platform?: string;
  title?: string;
  durationText?: string;
  durationSeconds?: number;
  publishedAt?: string;
  structureType?: string;
  proportions?: any;
  hookElementCount?: number;
  blockCount?: number;
  blocks?: any[];
  sections?: Record<string, string>;
}) {
  await supabase.from('competitor_fichas').upsert({
    competitor_id: ficha.competitorId,
    video_id: ficha.videoId,
    platform: ficha.platform || 'youtube',
    title: ficha.title,
    duration_text: ficha.durationText,
    duration_seconds: ficha.durationSeconds,
    published_at: ficha.publishedAt,
    structure_type: ficha.structureType,
    proportions: ficha.proportions || {},
    hook_element_count: ficha.hookElementCount || 0,
    block_count: ficha.blockCount || 0,
    blocks: ficha.blocks || [],
    sections: ficha.sections || {},
    generated_at: new Date().toISOString(),
  }, { onConflict: 'competitor_id,video_id' });
}

// -- Bookmarks --
export async function getBookmarks(tag?: string) {
  let query = supabase
    .from('competitor_bookmarks')
    .select('*')
    .order('saved_at', { ascending: false });
  if (tag) query = query.eq('tag', tag);
  const { data } = await query;
  return (data || []).map(b => ({
    id: b.id,
    competitorId: b.competitor_id,
    videoId: b.video_id,
    platform: b.platform,
    title: b.title,
    url: b.url,
    thumbnail: b.thumbnail,
    tag: b.tag,
    notes: b.notes,
    savedAt: b.saved_at,
  }));
}

export async function saveBookmark(bookmark: {
  competitorId: string;
  videoId: string;
  platform?: string;
  title?: string;
  url?: string;
  thumbnail?: string;
  tag?: string;
  notes?: string;
}) {
  await supabase.from('competitor_bookmarks').upsert({
    competitor_id: bookmark.competitorId,
    video_id: bookmark.videoId,
    platform: bookmark.platform || 'youtube',
    title: bookmark.title,
    url: bookmark.url,
    thumbnail: bookmark.thumbnail,
    tag: bookmark.tag || 'referência',
    notes: bookmark.notes,
    saved_at: new Date().toISOString(),
  }, { onConflict: 'competitor_id,video_id' });
}

export async function deleteBookmark(competitorId: string, videoId: string) {
  await supabase
    .from('competitor_bookmarks')
    .delete()
    .eq('competitor_id', competitorId)
    .eq('video_id', videoId);
}

// -- Trends --
export async function getTrends() {
  const { data } = await supabase
    .from('competitor_trends')
    .select('*')
    .order('last_seen_at', { ascending: false });
  return (data || []).map(t => ({
    id: t.id,
    topic: t.topic,
    keywords: t.keywords,
    competitorsInvolved: t.competitors_involved,
    signalCount: t.signal_count,
    lifecycle: t.lifecycle,
    firstSeenAt: t.first_seen_at,
    lastSeenAt: t.last_seen_at,
    sampleItems: t.sample_items,
  }));
}

export async function upsertTrend(trend: {
  topic: string;
  keywords?: string[];
  competitorsInvolved: any[];
  signalCount: number;
  lifecycle?: string;
  sampleItems?: any[];
}) {
  await supabase.from('competitor_trends').upsert({
    topic: trend.topic,
    keywords: trend.keywords || [],
    competitors_involved: trend.competitorsInvolved,
    signal_count: trend.signalCount,
    lifecycle: trend.lifecycle || 'emerging',
    last_seen_at: new Date().toISOString(),
    sample_items: trend.sampleItems || [],
  }, { onConflict: 'topic' });
}

// -- YouTube competitor stats (legacy) --
export async function getYoutubeCompetitorStats() {
  const { data } = await supabase.from('youtube_competitor_stats').select('*');
  return data || [];
}

export async function saveYoutubeCompetitorStat(stat: any) {
  await supabase.from('youtube_competitor_stats').upsert({
    channel_id: stat.channelId,
    title: stat.title,
    thumbnail: stat.thumbnail,
    subscriber_count: stat.subscriberCount,
    view_count: stat.viewCount,
    video_count: stat.videoCount,
    custom_url: stat.customUrl,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'channel_id' });
}
