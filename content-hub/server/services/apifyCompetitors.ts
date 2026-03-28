import {
  getCompetitorRegistry,
  saveCompetitorRegistry,
  getCompetitorPlatformData,
  saveCompetitorPlatformData,
  addCompetitorHistoryEntry,
  getCompetitorHistory as dbGetCompetitorHistory,
} from '../db/competitors.js';

const APIFY_TOKEN = process.env.APIFY_TOKEN || '';
const APIFY_BASE = 'https://api.apify.com/v2';

// --- Types ---

interface PlatformHandle {
  handle: string;
}

interface Competitor {
  id: string;
  name: string;
  niche: string;
  region: string;
  platforms: Record<string, PlatformHandle>;
}

interface Registry {
  competitors: Competitor[];
  updatedAt: string;
}

interface CompetitorProfile {
  handle: string;
  name: string;
  followers: number | null;
  bio: string | null;
  profilePicture: string | null;
  scrapedAt: string;
}

interface ContentItem {
  id: string;
  title: string;
  url: string;
  thumbnail: string | null;
  publishedAt: string;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  duration: number | null;
  type: string;
  zScore: number | null;
  isOutlier: boolean;  // z > 2
  isFlop: boolean;     // z < -1
  outlierMultiplier: string | null;  // e.g., "8.5x"
}

interface PlatformData {
  competitorId: string;
  platform: string;
  profile: CompetitorProfile;
  items: ContentItem[];
  syncedAt: string;
  source: 'apify';
  actorId: string;
  itemCount: number;
}

// --- Actor Config ---

// Map platform -> Apify actor ID and input builder
const ACTORS: Record<string, { actorId: string; buildInput: (handle: string) => any; transform: (raw: any[]) => { profile: Partial<CompetitorProfile>; items: ContentItem[] } }> = {
  youtube: {
    actorId: 'streamers~youtube-scraper',
    buildInput: (handle) => ({
      startUrls: [{ url: `https://www.youtube.com/${handle}/videos` }],
      maxResults: 50,
      maxResultsShorts: 0,
    }),
    transform: (raw) => {
      const items: ContentItem[] = raw.map((v: any) => ({
        id: v.id || v.videoId || '',
        title: v.title || v.text || '',
        url: v.url || (v.id ? `https://www.youtube.com/watch?v=${v.id}` : ''),
        thumbnail: v.thumbnailUrl || v.thumbnail || (v.id ? `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg` : null),
        publishedAt: v.date || v.uploadDate || v.publishedAt || '',
        views: parseInt(v.viewCount ?? v.views ?? '0') || null,
        likes: parseInt(v.likes ?? v.likeCount ?? '0') || null,
        comments: parseInt(v.commentsCount ?? v.commentCount ?? v.comments ?? '0') || null,
        shares: null,
        duration: v.duration || null,
        type: (v.isShort ? 'short' : 'video'),
        zScore: null,
        isOutlier: false,
        isFlop: false,
        outlierMultiplier: null,
      }));

      const first = raw[0] || {};
      const profile: Partial<CompetitorProfile> = {
        name: first.channelName || first.channel || null,
        followers: parseInt(first.channelFollowers ?? first.subscriberCount ?? '0') || null,
      };

      return { profile, items };
    },
  },
  instagram: {
    actorId: 'apify~instagram-post-scraper',
    buildInput: (handle) => ({
      username: [handle],
      resultsLimit: 30,
    }),
    transform: (raw) => {
      const items: ContentItem[] = raw.map((p: any) => ({
        id: p.id || p.shortCode || '',
        title: (p.caption || '').slice(0, 300),
        url: p.url || (p.shortCode ? `https://www.instagram.com/p/${p.shortCode}/` : ''),
        thumbnail: p.displayUrl || p.thumbnailUrl || p.previewUrl || null,
        publishedAt: p.timestamp || p.takenAtTimestamp ? new Date((p.takenAtTimestamp || 0) * 1000).toISOString() : '',
        views: parseInt(p.videoViewCount ?? '0') || null,
        likes: parseInt(p.likesCount ?? p.likes ?? '0') || null,
        comments: parseInt(p.commentsCount ?? p.comments ?? '0') || null,
        shares: null,
        duration: p.videoDuration || null,
        type: p.type || (p.isVideo ? 'reel' : p.childPosts ? 'carousel' : 'post'),
        zScore: null,
        isOutlier: false,
        isFlop: false,
        outlierMultiplier: null,
      }));

      const first = raw[0] || {};
      const profile: Partial<CompetitorProfile> = {
        name: first.ownerFullName || first.ownerUsername || null,
        followers: parseInt(first.ownerFollowerCount ?? '0') || null,
        bio: first.ownerBiography || null,
        profilePicture: first.ownerProfilePicUrl || null,
      };

      return { profile, items };
    },
  },
  tiktok: {
    actorId: 'clockworks~free-tiktok-scraper',
    buildInput: (handle) => ({
      profiles: [handle],
      resultsPerPage: 30,
      shouldDownloadCovers: false,
    }),
    transform: (raw) => {
      const items: ContentItem[] = raw.map((v: any) => ({
        id: v.id || '',
        title: (v.text || v.desc || v.description || '').slice(0, 300),
        url: v.webVideoUrl || v.url || '',
        thumbnail: v.cover || v.dynamicCover || v.originCover || null,
        publishedAt: v.createTimeISO || (v.createTime ? new Date(v.createTime * 1000).toISOString() : ''),
        views: parseInt(v.playCount ?? v.views ?? '0') || null,
        likes: parseInt(v.diggCount ?? v.likes ?? '0') || null,
        comments: parseInt(v.commentCount ?? v.comments ?? '0') || null,
        shares: parseInt(v.shareCount ?? v.shares ?? '0') || null,
        duration: v.duration || v.videoLength || null,
        type: 'video',
        zScore: null,
        isOutlier: false,
        isFlop: false,
        outlierMultiplier: null,
      }));

      const first = raw[0] || {};
      const authorStats = first.authorMeta || first.author || {};
      const profile: Partial<CompetitorProfile> = {
        name: authorStats.nickName || authorStats.nickname || authorStats.name || null,
        followers: parseInt(authorStats.fans ?? authorStats.followers ?? '0') || null,
        bio: authorStats.signature || null,
        profilePicture: authorStats.avatar || null,
      };

      return { profile, items };
    },
  },
  twitter: {
    actorId: 'apidojo~tweet-scraper',
    buildInput: (handle) => ({
      handle: [handle],
      maxTweets: 50,
      mode: 'user',
    }),
    transform: (raw) => {
      const items: ContentItem[] = raw.map((t: any) => ({
        id: t.id || t.id_str || '',
        title: (t.full_text || t.text || '').slice(0, 300),
        url: t.url || (t.id ? `https://x.com/i/status/${t.id}` : ''),
        thumbnail: t.entities?.media?.[0]?.media_url_https || null,
        publishedAt: t.created_at || '',
        views: parseInt(t.views ?? t.view_count ?? '0') || null,
        likes: parseInt(t.favorite_count ?? t.likes ?? '0') || null,
        comments: parseInt(t.reply_count ?? t.replies ?? '0') || null,
        shares: parseInt(t.retweet_count ?? t.retweets ?? '0') || null,
        duration: null,
        type: t.is_quote_status ? 'quote' : t.in_reply_to_status_id ? 'reply' : 'tweet',
        zScore: null,
        isOutlier: false,
        isFlop: false,
        outlierMultiplier: null,
      }));

      const first = raw[0] || {};
      const user = first.user || {};
      const profile: Partial<CompetitorProfile> = {
        name: user.name || null,
        followers: parseInt(user.followers_count ?? '0') || null,
        bio: user.description || null,
        profilePicture: user.profile_image_url_https || null,
      };

      return { profile, items };
    },
  },
};

// --- Registry Functions ---

export async function getRegistry(): Promise<Registry> {
  return await getCompetitorRegistry();
}

export async function saveRegistry(data: Registry): Promise<void> {
  await saveCompetitorRegistry(data.competitors);
}

// --- Apify Core ---

async function callApifyActor(actorId: string, input: any): Promise<any[]> {
  if (!APIFY_TOKEN) throw new Error('APIFY_TOKEN not configured');

  const url = `${APIFY_BASE}/acts/${encodeURIComponent(actorId)}/run-sync-get-dataset-items?token=${APIFY_TOKEN}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(300_000), // 5 min timeout
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Apify error ${res.status}: ${text.slice(0, 200)}`);
  }

  return res.json();
}

// --- Z-Score Calculation ---

function calculateZScores(items: ContentItem[], metricKey: 'views' | 'likes'): void {
  const values = items.map(i => (i[metricKey] as number) ?? 0).filter(v => v > 0);
  if (values.length < 3) return; // Need at least 3 items for meaningful stats

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) return; // All same value

  for (const item of items) {
    const val = (item[metricKey] as number) ?? 0;
    if (val <= 0) {
      item.zScore = null;
      item.isOutlier = false;
      item.isFlop = false;
      item.outlierMultiplier = null;
      continue;
    }
    const z = (val - mean) / stdDev;
    item.zScore = Math.round(z * 100) / 100;
    item.isOutlier = z > 2;
    item.isFlop = z < -1;
    item.outlierMultiplier = mean > 0 ? (val / mean).toFixed(1) + 'x' : null;
  }
}

// --- Sync Functions ---

// Locks to prevent duplicate syncs
const syncLocks = new Set<string>();

export async function syncCompetitorPlatform(competitorId: string, platform: string): Promise<PlatformData> {
  const lockKey = `${competitorId}:${platform}`;
  if (syncLocks.has(lockKey)) throw new Error(`Sync already in progress for ${lockKey}`);

  const registry = await getRegistry();
  const competitor = registry.competitors.find(c => c.id === competitorId);
  if (!competitor) throw new Error(`Competitor ${competitorId} not found`);

  const platformConfig = competitor.platforms[platform];
  if (!platformConfig) throw new Error(`${competitorId} has no ${platform} handle`);

  const actorConfig = ACTORS[platform];
  if (!actorConfig) throw new Error(`No scraper configured for ${platform}`);

  syncLocks.add(lockKey);
  try {
    console.log(`[sync] Starting ${competitorId}/${platform} via ${actorConfig.actorId}`);

    const input = actorConfig.buildInput(platformConfig.handle);
    const rawData = await callApifyActor(actorConfig.actorId, input);

    console.log(`[sync] Got ${rawData.length} items for ${competitorId}/${platform}`);

    const { profile: partialProfile, items } = actorConfig.transform(rawData);

    const profile: CompetitorProfile = {
      handle: platformConfig.handle,
      name: partialProfile.name || competitor.name,
      followers: partialProfile.followers || null,
      bio: partialProfile.bio || null,
      profilePicture: partialProfile.profilePicture || null,
      scrapedAt: new Date().toISOString(),
    };

    // Calculate z-scores
    const filteredItems = items.filter(i => i.id);
    const metricKey = (platform === 'youtube' || platform === 'tiktok') ? 'views' : 'likes';
    calculateZScores(filteredItems, metricKey as any);

    const data: PlatformData = {
      competitorId,
      platform,
      profile,
      items: filteredItems,
      syncedAt: new Date().toISOString(),
      source: 'apify',
      actorId: actorConfig.actorId,
      itemCount: items.length,
    };

    // Save to Supabase
    await saveCompetitorPlatformData(competitorId, platform, data);

    // Save history snapshot
    await addCompetitorHistoryEntry(competitorId, platform, {
      syncedAt: data.syncedAt,
      followers: profile.followers,
      itemCount: data.itemCount,
      outlierCount: filteredItems.filter(i => i.isOutlier).length,
      flopCount: filteredItems.filter(i => i.isFlop).length,
    });

    return data;
  } finally {
    syncLocks.delete(lockKey);
  }
}

export function isSyncing(competitorId: string, platform: string): boolean {
  return syncLocks.has(`${competitorId}:${platform}`);
}

// --- Read Functions ---

export async function getCompetitorData(competitorId: string, platform: string): Promise<PlatformData | null> {
  return await getCompetitorPlatformData(competitorId, platform);
}

// Get all available data for a competitor
export async function getCompetitorAllPlatforms(competitorId: string): Promise<Record<string, PlatformData>> {
  const registry = await getRegistry();
  const competitor = registry.competitors.find(c => c.id === competitorId);
  if (!competitor) return {};

  const result: Record<string, PlatformData> = {};
  for (const platform of Object.keys(competitor.platforms)) {
    const data = await getCompetitorPlatformData(competitorId, platform);
    if (data) result[platform] = data as PlatformData;
  }
  return result;
}

// Aggregated feed of all content across all competitors
export async function getFeed(filters?: {
  competitorIds?: string[];
  platforms?: string[];
  category?: 'outliers' | 'flops' | 'all';
  sortBy?: 'views' | 'likes' | 'comments' | 'date' | 'zScore';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
}): Promise<{ items: (ContentItem & { competitorId: string; competitorName: string; platform: string })[], total: number, outlierCount: number, flopCount: number }> {
  const registry = await getRegistry();
  const allItems: (ContentItem & { competitorId: string; competitorName: string; platform: string })[] = [];

  for (const competitor of registry.competitors) {
    if (filters?.competitorIds && !filters.competitorIds.includes(competitor.id)) continue;

    const platformsData = await getCompetitorAllPlatforms(competitor.id);
    for (const [platform, data] of Object.entries(platformsData)) {
      if (filters?.platforms && !filters.platforms.includes(platform)) continue;

      for (const item of data.items) {
        allItems.push({
          ...item,
          competitorId: competitor.id,
          competitorName: competitor.name,
          platform,
        });
      }
    }
  }

  // Count before filtering
  const outlierCount = allItems.filter(i => i.isOutlier).length;
  const flopCount = allItems.filter(i => i.isFlop).length;

  // Category filter BEFORE sort+limit
  let filtered = allItems;
  if (filters?.category === 'outliers') {
    filtered = filtered.filter(i => i.isOutlier);
  } else if (filters?.category === 'flops') {
    filtered = filtered.filter(i => i.isFlop);
  }

  // Date range filter
  if (filters?.dateFrom) {
    filtered = filtered.filter(i => i.publishedAt >= filters.dateFrom!);
  }
  if (filters?.dateTo) {
    const toEnd = filters.dateTo + 'T23:59:59';
    filtered = filtered.filter(i => i.publishedAt <= toEnd);
  }

  // Sort
  const sortBy = filters?.sortBy || 'date';
  const sortOrder = filters?.sortOrder || 'desc';
  const multiplier = sortOrder === 'desc' ? -1 : 1;

  filtered.sort((a, b) => {
    if (sortBy === 'date') return multiplier * ((a.publishedAt || '').localeCompare(b.publishedAt || ''));
    if (sortBy === 'zScore') return multiplier * ((a.zScore ?? -999) - (b.zScore ?? -999));
    const valA = (a as any)[sortBy] ?? 0;
    const valB = (b as any)[sortBy] ?? 0;
    return multiplier * (valA - valB);
  });

  const limit = filters?.limit || 500;
  return { items: filtered.slice(0, limit), total: filtered.length, outlierCount, flopCount };
}

// Get sync status for all competitors
export async function getSyncStatus(): Promise<Record<string, Record<string, { syncedAt: string | null; itemCount: number; syncing: boolean }>>> {
  const registry = await getRegistry();
  const status: Record<string, Record<string, { syncedAt: string | null; itemCount: number; syncing: boolean }>> = {};

  for (const competitor of registry.competitors) {
    status[competitor.id] = {};
    for (const platform of Object.keys(competitor.platforms)) {
      const data = await getCompetitorData(competitor.id, platform);
      status[competitor.id][platform] = {
        syncedAt: data?.syncedAt || null,
        itemCount: data?.itemCount || 0,
        syncing: isSyncing(competitor.id, platform),
      };
    }
  }

  return status;
}

export async function getCompetitorHistory(competitorId: string, platform: string): Promise<any[]> {
  return await dbGetCompetitorHistory(competitorId, platform);
}

export const SUPPORTED_PLATFORMS = Object.keys(ACTORS);
