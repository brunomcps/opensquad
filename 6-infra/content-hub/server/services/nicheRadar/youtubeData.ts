// Cliente da YouTube Data API v3 para o Radar de Viral do Nicho.
// Usa API key simples (YT_DATA_API_KEY) — leitura de dados públicos, não expira.

const API = 'https://www.googleapis.com/youtube/v3';

function key(): string {
  const k = process.env.YT_DATA_API_KEY;
  if (!k) throw new Error('[radar] YT_DATA_API_KEY não definida no .env');
  return k;
}

async function get(path: string, params: Record<string, string>): Promise<any> {
  const qs = new URLSearchParams({ ...params, key: key() }).toString();
  const res = await fetch(`${API}/${path}?${qs}`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`[radar] YouTube API ${path} ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

export interface ResolvedChannel {
  channel_id: string;
  name: string;
  subscribers: number;
  uploads_playlist: string;
}

/** Resolve um canal por channelId, handle (@nome) ou texto de busca. */
export async function resolveChannel(ref: {
  channelId?: string;
  handle?: string;
  query?: string;
}): Promise<ResolvedChannel> {
  let channelId = ref.channelId;

  if (!channelId && ref.query) {
    const s = await get('search', {
      part: 'snippet', q: ref.query, type: 'channel', maxResults: '1',
    });
    channelId = s.items?.[0]?.snippet?.channelId || s.items?.[0]?.id?.channelId;
    if (!channelId) throw new Error(`[radar] canal não encontrado pra query "${ref.query}"`);
  }

  const params: Record<string, string> = { part: 'snippet,statistics,contentDetails' };
  if (channelId) params.id = channelId;
  else if (ref.handle) params.forHandle = ref.handle.replace(/^@/, '');
  else throw new Error('[radar] resolveChannel precisa de channelId, handle ou query');

  const r = await get('channels', params);
  const it = r.items?.[0];
  if (!it) throw new Error(`[radar] canal não encontrado: ${JSON.stringify(ref)}`);
  return {
    channel_id: it.id,
    name: it.snippet.title,
    subscribers: Number(it.statistics?.subscriberCount ?? 0),
    uploads_playlist: it.contentDetails.relatedPlaylists.uploads,
  };
}

export interface UploadItem {
  video_id: string;
  published_at: string;
}

/** Lista os vídeos recentes da playlist de uploads, parando antes de `since` (ISO). */
export async function listUploads(uploadsPlaylist: string, since?: string, maxPages = 3): Promise<UploadItem[]> {
  const out: UploadItem[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < maxPages; page++) {
    const params: Record<string, string> = {
      part: 'contentDetails', playlistId: uploadsPlaylist, maxResults: '50',
    };
    if (pageToken) params.pageToken = pageToken;
    const r = await get('playlistItems', params);
    for (const it of r.items ?? []) {
      const publishedAt = it.contentDetails.videoPublishedAt;
      if (since && publishedAt && publishedAt < since) return out; // playlist vem do mais novo
      out.push({ video_id: it.contentDetails.videoId, published_at: publishedAt });
    }
    pageToken = r.nextPageToken;
    if (!pageToken) break;
  }
  return out;
}

export interface VideoStats {
  video_id: string;
  title: string;
  published_at: string;
  duration_sec: number;
  thumb_url: string;
  views: number;
  likes: number;
  comments: number;
}

/** Detalhes + estatísticas de vídeos (em lotes de 50). */
export async function getVideoStats(videoIds: string[]): Promise<VideoStats[]> {
  const out: VideoStats[] = [];
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const r = await get('videos', {
      part: 'snippet,statistics,contentDetails', id: batch.join(','),
    });
    for (const it of r.items ?? []) {
      out.push({
        video_id: it.id,
        title: it.snippet.title,
        published_at: it.snippet.publishedAt,
        duration_sec: parseDuration(it.contentDetails?.duration),
        thumb_url: it.snippet.thumbnails?.medium?.url ?? it.snippet.thumbnails?.default?.url ?? '',
        views: Number(it.statistics?.viewCount ?? 0),
        likes: Number(it.statistics?.likeCount ?? 0),
        comments: Number(it.statistics?.commentCount ?? 0),
      });
    }
  }
  return out;
}

/** ISO 8601 (PT#H#M#S) → segundos. */
export function parseDuration(iso?: string): number {
  if (!iso) return 0;
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (Number(m[1] ?? 0)) * 3600 + (Number(m[2] ?? 0)) * 60 + Number(m[3] ?? 0);
}
