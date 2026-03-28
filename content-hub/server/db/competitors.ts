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
