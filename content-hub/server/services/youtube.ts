import { youtube } from './youtubeClient.js';

export interface YouTubeVideoItem {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  thumbnailHigh?: string;
  publishedAt: string;
  scheduledAt?: string;
  privacyStatus: string;
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  duration?: string;
  durationSeconds: number;
  isShort: boolean;
  tags?: string[];
  categoryId?: string;
  defaultLanguage?: string;
}

function parseDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const h = parseInt(match[1] || '0');
  const m = parseInt(match[2] || '0');
  const s = parseInt(match[3] || '0');
  return h * 3600 + m * 60 + s;
}

export async function getChannelVideos(): Promise<YouTubeVideoItem[]> {
  // Step 1: Get the uploads playlist ID
  const channelRes = await youtube.channels.list({
    part: ['contentDetails'],
    mine: true,
  });

  const uploadsPlaylistId =
    channelRes.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

  if (!uploadsPlaylistId) {
    throw new Error('Could not find uploads playlist');
  }

  // Step 2: Paginate through ALL videos in the uploads playlist
  const allVideoIds: string[] = [];
  let nextPageToken: string | undefined;

  do {
    const playlistRes = await youtube.playlistItems.list({
      part: ['contentDetails'],
      playlistId: uploadsPlaylistId,
      maxResults: 50,
      pageToken: nextPageToken,
    });

    const ids = playlistRes.data.items
      ?.map((item) => item.contentDetails?.videoId)
      .filter(Boolean) as string[];

    if (ids?.length) allVideoIds.push(...ids);
    nextPageToken = playlistRes.data.nextPageToken || undefined;
  } while (nextPageToken);

  if (!allVideoIds.length) return [];

  // Step 3: Get full video details in batches of 50 (API limit)
  const allVideos: YouTubeVideoItem[] = [];

  for (let i = 0; i < allVideoIds.length; i += 50) {
    const batch = allVideoIds.slice(i, i + 50);
    const videosRes = await youtube.videos.list({
      part: ['snippet', 'status', 'statistics', 'contentDetails'],
      id: batch,
    });

    const mapped = (videosRes.data.items || []).map((video) => {
      const durationISO = video.contentDetails?.duration || '';
      const durationSeconds = parseDuration(durationISO);

      return {
        id: video.id!,
        title: video.snippet?.title || '',
        description: video.snippet?.description || '',
        thumbnail:
          video.snippet?.thumbnails?.medium?.url ||
          video.snippet?.thumbnails?.default?.url ||
          '',
        thumbnailHigh:
          video.snippet?.thumbnails?.high?.url ||
          video.snippet?.thumbnails?.medium?.url ||
          '',
        publishedAt: video.snippet?.publishedAt || '',
        scheduledAt: video.status?.publishAt || undefined,
        privacyStatus: video.status?.privacyStatus || 'unknown',
        viewCount: Number(video.statistics?.viewCount) || 0,
        likeCount: Number(video.statistics?.likeCount) || 0,
        commentCount: Number(video.statistics?.commentCount) || 0,
        duration: durationISO,
        durationSeconds,
        isShort: durationSeconds < 300,
        tags: video.snippet?.tags || [],
        categoryId: video.snippet?.categoryId || '',
        defaultLanguage: video.snippet?.defaultLanguage || '',
      };
    });

    allVideos.push(...mapped);
  }

  // Deduplicate by ID
  const seen = new Set<string>();
  return allVideos.filter((v) => {
    if (seen.has(v.id)) return false;
    seen.add(v.id);
    return true;
  });
}

export interface ChannelStatsResult {
  channelId: string;
  title: string;
  thumbnail: string;
  customUrl: string;
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
}

export async function getChannelStats(): Promise<ChannelStatsResult> {
  const res = await youtube.channels.list({
    part: ['snippet', 'statistics'],
    mine: true,
  });

  const ch = res.data.items?.[0];
  if (!ch?.statistics) throw new Error('Could not fetch channel statistics');

  return {
    channelId: ch.id || '',
    title: ch.snippet?.title || '',
    thumbnail: ch.snippet?.thumbnails?.medium?.url || ch.snippet?.thumbnails?.default?.url || '',
    customUrl: ch.snippet?.customUrl || '',
    subscriberCount: Number(ch.statistics.subscriberCount) || 0,
    viewCount: Number(ch.statistics.viewCount) || 0,
    videoCount: Number(ch.statistics.videoCount) || 0,
  };
}

export interface UpdateVideoParams {
  title?: string;
  description?: string;
  tags?: string[];
  categoryId?: string;
}

export async function updateVideo(videoId: string, params: UpdateVideoParams) {
  // First, fetch current snippet to preserve fields we're not updating
  const current = await youtube.videos.list({
    part: ['snippet'],
    id: [videoId],
  });

  const currentSnippet = current.data.items?.[0]?.snippet;
  if (!currentSnippet) throw new Error('Video not found');

  const snippet: any = {
    title: params.title ?? currentSnippet.title,
    description: params.description ?? currentSnippet.description,
    tags: params.tags ?? currentSnippet.tags,
    categoryId: params.categoryId ?? currentSnippet.categoryId,
  };

  const res = await youtube.videos.update({
    part: ['snippet'],
    requestBody: {
      id: videoId,
      snippet,
    },
  });

  return {
    id: res.data.id,
    title: res.data.snippet?.title,
    description: res.data.snippet?.description,
    tags: res.data.snippet?.tags,
  };
}

export interface CompetitorInfo {
  channelId: string;
  title: string;
  thumbnail: string;
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
  customUrl?: string;
}

async function resolveChannelId(input: string): Promise<string> {
  const trimmed = input.trim();

  // Already a channel ID (UC...)
  if (/^UC[\w-]{22}$/.test(trimmed)) return trimmed;

  // Extract from URL: youtube.com/channel/UCxxxx
  const channelMatch = trimmed.match(/youtube\.com\/channel\/(UC[\w-]{22})/);
  if (channelMatch) return channelMatch[1];

  // Extract handle from URL or clean input
  let query = trimmed;
  const handleMatch = trimmed.match(/youtube\.com\/@([\w.-]+)/);
  if (handleMatch) query = handleMatch[1];
  if (query.startsWith('@')) query = query.slice(1);

  // Search for the channel by name/handle
  const res = await youtube.search.list({
    part: ['snippet'],
    q: query,
    type: ['channel'],
    maxResults: 1,
  });

  const id = res.data.items?.[0]?.snippet?.channelId;
  if (!id) throw new Error(`Canal nao encontrado: ${input}`);
  return id;
}

export async function getCompetitorStats(input: string): Promise<CompetitorInfo> {
  const channelId = await resolveChannelId(input);

  const res = await youtube.channels.list({
    part: ['snippet', 'statistics'],
    id: [channelId],
  });

  const ch = res.data.items?.[0];
  if (!ch) throw new Error(`Channel ${channelId} not found`);

  return {
    channelId: ch.id!,
    title: ch.snippet?.title || '',
    thumbnail: ch.snippet?.thumbnails?.medium?.url || ch.snippet?.thumbnails?.default?.url || '',
    subscriberCount: Number(ch.statistics?.subscriberCount) || 0,
    viewCount: Number(ch.statistics?.viewCount) || 0,
    videoCount: Number(ch.statistics?.videoCount) || 0,
    customUrl: ch.snippet?.customUrl || '',
  };
}
