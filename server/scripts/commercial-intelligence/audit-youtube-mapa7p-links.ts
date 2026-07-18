import { google, type youtube_v3 } from 'googleapis';

const SHORT_MAX_SECONDS = 180;
const PUBLIC_BASE = 'https://link.brunosallesphd.com.br/m7p/';
const SEARCH_TERMS = [
  'mapa-triagem-tdah',
  'K103806991N',
  'link.brunosallesphd.com.br/m7p',
  'MAPA-7P',
] as const;

type TargetKind = 'legacy_landing_page' | 'legacy_hotmart' | 'current_tracking';

type TargetUrl = {
  url: string;
  kind: TargetKind;
  occurrences: number;
};

type VideoRecord = {
  videoId: string;
  title: string;
  durationSeconds: number;
  description: string;
  publishedAt: string;
};

type CommentCandidate = {
  id: string;
  videoId: string;
  text: string;
  authorChannelId: string;
  authorDisplayName: string;
  matches: TargetUrl[];
};

type RedirectCheck = {
  ok: boolean;
  status: number;
  location: string | null;
};

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function parseDurationSeconds(value: string): number {
  const match = value.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return 0;
  return Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0);
}

function compactVideoId(videoId: string): string {
  return videoId
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(0, 45)
    .toLowerCase();
}

function trackingUrl(videoId: string, suffix: 'd' | 'c'): string {
  return `${PUBLIC_BASE}${compactVideoId(videoId)}-${suffix}`;
}

function normalizeExtractedUrl(raw: string): string {
  return raw.replace(/[),.;!?\]}>'\"]+$/g, '');
}

function extractUrls(text: string): string[] {
  return (text.match(/https?:\/\/[^\s<]+/gi) || []).map(normalizeExtractedUrl);
}

function classifyTargetUrl(rawUrl: string): TargetKind | null {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase().replace(/\/+$/, '');

    if (host === 'brunosallesphd.kpages.online' && path === '/mapa-triagem-tdah') {
      return 'legacy_landing_page';
    }
    if (host === 'go.hotmart.com' && path === '/k103806991n') {
      return 'legacy_hotmart';
    }
    if (host === 'link.brunosallesphd.com.br' && path.startsWith('/m7p/')) {
      return 'current_tracking';
    }
  } catch {
    return null;
  }
  return null;
}

function targetUrls(text: string): TargetUrl[] {
  const grouped = new Map<string, TargetUrl>();
  for (const url of extractUrls(text)) {
    const kind = classifyTargetUrl(url);
    if (!kind) continue;
    const key = `${kind}|${url}`;
    const current = grouped.get(key);
    grouped.set(key, current
      ? { ...current, occurrences: current.occurrences + 1 }
      : { url, kind, occurrences: 1 });
  }
  return [...grouped.values()];
}

function deduplicateComments(comments: CommentCandidate[]): CommentCandidate[] {
  return [...new Map(comments.map((comment) => [comment.id, comment])).values()];
}

async function checkRedirects(urls: string[]): Promise<Map<string, RedirectCheck>> {
  const uniqueUrls = [...new Set(urls)];
  const results = new Map<string, RedirectCheck>();
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < uniqueUrls.length) {
      const url = uniqueUrls[nextIndex];
      nextIndex += 1;
      try {
        const response = await fetch(url, { method: 'HEAD', redirect: 'manual' });
        results.set(url, {
          ok: response.status === 302 && Boolean(response.headers.get('location')),
          status: response.status,
          location: response.headers.get('location'),
        });
      } catch {
        results.set(url, { ok: false, status: 0, location: null });
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(10, uniqueUrls.length) }, () => worker()));
  return results;
}

async function listUploadVideoIds(youtube: youtube_v3.Youtube, playlistId: string): Promise<string[]> {
  const ids: string[] = [];
  let pageToken: string | undefined;

  do {
    const response = await youtube.playlistItems.list({
      part: ['contentDetails'],
      playlistId,
      maxResults: 50,
      pageToken,
    });
    for (const item of response.data.items || []) {
      const videoId = item.contentDetails?.videoId;
      if (videoId) ids.push(videoId);
    }
    pageToken = response.data.nextPageToken || undefined;
  } while (pageToken);

  return [...new Set(ids)];
}

async function listVideos(youtube: youtube_v3.Youtube, videoIds: string[]): Promise<VideoRecord[]> {
  const videos: VideoRecord[] = [];
  for (let index = 0; index < videoIds.length; index += 50) {
    const response = await youtube.videos.list({
      part: ['snippet', 'contentDetails'],
      id: videoIds.slice(index, index + 50),
    });
    for (const item of response.data.items || []) {
      if (!item.id) continue;
      videos.push({
        videoId: item.id,
        title: item.snippet?.title || '',
        durationSeconds: parseDurationSeconds(item.contentDetails?.duration || ''),
        description: item.snippet?.description || '',
        publishedAt: item.snippet?.publishedAt || '',
      });
    }
  }
  return videos;
}

async function searchOwnComments(
  youtube: youtube_v3.Youtube,
  channelId: string,
): Promise<{ comments: CommentCandidate[]; requests: number }> {
  const comments: CommentCandidate[] = [];
  let requests = 0;

  for (const searchTerms of SEARCH_TERMS) {
    let pageToken: string | undefined;
    do {
      const response = await youtube.commentThreads.list({
        part: ['snippet'],
        allThreadsRelatedToChannelId: channelId,
        maxResults: 100,
        pageToken,
        searchTerms,
        textFormat: 'plainText',
      });
      requests += 1;

      for (const item of response.data.items || []) {
        const videoId = item.snippet?.videoId;
        const topLevel = item.snippet?.topLevelComment;
        const snippet = topLevel?.snippet;
        const authorChannelId = snippet?.authorChannelId?.value || '';
        if (!videoId || !topLevel?.id || !snippet || authorChannelId !== channelId) continue;

        const text = snippet.textOriginal || snippet.textDisplay || '';
        const matches = targetUrls(text);
        if (!matches.length) continue;

        comments.push({
          id: topLevel.id,
          videoId,
          text,
          authorChannelId,
          authorDisplayName: snippet.authorDisplayName || '',
          matches,
        });
      }

      pageToken = response.data.nextPageToken || undefined;
    } while (pageToken);
  }

  return { comments: deduplicateComments(comments), requests };
}

function summarizePlacement(matches: TargetUrl[], expectedCurrentUrl: string) {
  const legacy = matches.filter((match) => match.kind !== 'current_tracking');
  const current = matches.filter((match) => match.kind === 'current_tracking');
  const exactCurrent = current.filter((match) => match.url.replace(/\/+$/, '') === expectedCurrentUrl);

  if (legacy.length === 1 && current.length === 0) return 'ready';
  if (legacy.length === 0 && exactCurrent.length === 1 && current.length === 1) return 'already_current';
  if (legacy.length === 0 && current.length === 0) return 'missing';
  return 'ambiguous';
}

async function main() {
  const oauth = new google.auth.OAuth2(
    requireEnv('YOUTUBE_CLIENT_ID'),
    requireEnv('YOUTUBE_CLIENT_SECRET'),
    'http://localhost:3000/callback',
  );
  oauth.setCredentials({ refresh_token: requireEnv('YOUTUBE_REFRESH_TOKEN') });
  const youtube = google.youtube({ version: 'v3', auth: oauth });

  const channelResponse = await youtube.channels.list({
    part: ['snippet', 'contentDetails'],
    mine: true,
  });
  const channel = channelResponse.data.items?.[0];
  const channelId = channel?.id;
  const uploadsPlaylistId = channel?.contentDetails?.relatedPlaylists?.uploads;
  if (!channelId || !uploadsPlaylistId) throw new Error('The authorized YouTube channel could not be resolved.');

  const uploadVideoIds = await listUploadVideoIds(youtube, uploadsPlaylistId);
  const allVideos = await listVideos(youtube, uploadVideoIds);
  const eligibleVideos = allVideos
    .filter((video) => video.durationSeconds > SHORT_MAX_SECONDS)
    .sort((left, right) => right.publishedAt.localeCompare(left.publishedAt));
  const eligibleIds = new Set(eligibleVideos.map((video) => video.videoId));

  const commentSearch = await searchOwnComments(youtube, channelId);
  const ownTargetComments = commentSearch.comments.filter((comment) => eligibleIds.has(comment.videoId));

  const redirectChecks = await checkRedirects(eligibleVideos.flatMap((video) => [
    trackingUrl(video.videoId, 'd'),
    trackingUrl(video.videoId, 'c'),
  ]));

  const rows = eligibleVideos.map((video) => {
    const descriptionMatches = targetUrls(video.description);
    const expectedDescriptionUrl = trackingUrl(video.videoId, 'd');
    const expectedCommentUrl = trackingUrl(video.videoId, 'c');
    const comments = ownTargetComments.filter((comment) => comment.videoId === video.videoId);

    let commentStatus = 'missing';
    if (comments.length === 1) {
      commentStatus = summarizePlacement(comments[0].matches, expectedCommentUrl);
    } else if (comments.length > 1) {
      commentStatus = 'ambiguous';
    }

    return {
      videoId: video.videoId,
      title: video.title,
      durationSeconds: video.durationSeconds,
      description: {
        status: summarizePlacement(descriptionMatches, expectedDescriptionUrl),
        matches: descriptionMatches,
        replacementUrl: expectedDescriptionUrl,
        replacementRedirect: redirectChecks.get(expectedDescriptionUrl),
      },
      comment: {
        status: commentStatus,
        replacementUrl: expectedCommentUrl,
        replacementRedirect: redirectChecks.get(expectedCommentUrl),
        candidates: comments.map((comment) => ({
          id: comment.id,
          authorDisplayName: comment.authorDisplayName,
          matches: comment.matches,
          replacementUrl: expectedCommentUrl,
          textPreview: comment.text.replace(/\s+/g, ' ').slice(0, 240),
        })),
      },
    };
  });

  function countsFor(key: 'description' | 'comment') {
    return Object.fromEntries(['ready', 'already_current', 'missing', 'ambiguous'].map((status) => [
      status,
      rows.filter((row) => row[key].status === status).length,
    ]));
  }

  console.log(JSON.stringify({
    ok: true,
    mode: 'read-only-dry-run',
    generatedAt: new Date().toISOString(),
    youtubeChannel: {
      id: channelId,
      title: channel.snippet?.title || '',
      customUrl: channel.snippet?.customUrl || '',
    },
    scope: {
      uploadVideosRead: allVideos.length,
      shortsExcluded: allVideos.filter((video) => video.durationSeconds <= SHORT_MAX_SECONDS).length,
      eligibleNonShortVideos: eligibleVideos.length,
      shortThresholdSeconds: SHORT_MAX_SECONDS,
    },
    apiEvidence: {
      estimatedReadQuotaUnits: 1 + Math.ceil(uploadVideoIds.length / 50) + Math.ceil(uploadVideoIds.length / 50) + commentSearch.requests,
      commentSearchRequests: commentSearch.requests,
      searchTerms: SEARCH_TERMS,
      writeRequests: 0,
    },
    summary: {
      descriptions: countsFor('description'),
      comments: countsFor('comment'),
      ownTargetCommentCandidates: ownTargetComments.length,
      replacementRedirects: {
        checked: redirectChecks.size,
        healthy: [...redirectChecks.values()].filter((check) => check.ok).length,
        unhealthy: [...redirectChecks.values()].filter((check) => !check.ok).length,
      },
    },
    rows,
  }, null, 2));
}

main().catch((error: unknown) => {
  console.error(JSON.stringify({
    ok: false,
    mode: 'read-only-dry-run',
    error: error instanceof Error ? error.message : 'Unknown error',
  }));
  process.exitCode = 1;
});
