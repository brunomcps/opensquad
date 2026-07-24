import { google, type youtube_v3 } from 'googleapis';

const APPLY = process.argv.includes('--apply');
const SHORT_MAX_SECONDS = 180;
const EXPECTED_CHANNEL_ID = 'UCpmfJntO4W6J6u0jEnRQRiQ';
const EXPECTED_ELIGIBLE_VIDEOS = 52;
const EXPECTED_TARGET_COMMENTS = 50;
const EXPECTED_MISSING_COMMENTS = 2;
const DESCRIPTION_MAX_BYTES = 5_000;
const MIN_SEPARATOR_LENGTH = 20;
const PUBLIC_BASE = 'https://link.brunosallesphd.com.br/m7p/';
const SEARCH_TERMS = [
  'mapa-triagem-tdah',
  'K103806991N',
  'link.brunosallesphd.com.br/m7p',
  'MAPA-7P',
] as const;
const VERIFY_ATTEMPTS = 6;
const VERIFY_DELAY_MS = 1_500;

type PlacementStatus = 'ready' | 'already_current' | 'missing' | 'ambiguous';

type VideoRecord = {
  videoId: string;
  title: string;
  durationSeconds: number;
  publishedAt: string;
  snippet: youtube_v3.Schema$VideoSnippet;
};

type CommentCandidate = {
  id: string;
  videoId: string;
  text: string;
  authorChannelId: string;
};

type Placement = {
  status: PlacementStatus;
  legacyUrl: string | null;
  expectedUrl: string;
};

type BatchRow = {
  video: VideoRecord;
  description: Placement;
  comment: Placement & { candidate: CommentCandidate | null };
};

type QuotaEstimate = {
  reads: number;
  writes: number;
};

const quota: QuotaEstimate = { reads: 0, writes: 0 };

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
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

function isCurrentTrackingUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    return parsed.hostname.toLowerCase() === 'link.brunosallesphd.com.br'
      && parsed.pathname.toLowerCase().startsWith('/m7p/');
  } catch {
    return false;
  }
}

function legacyUrlFor(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase().replace(/\/+$/, '');
    if (host === 'go.hotmart.com' && path === '/k103806991n') return rawUrl;
    if (host === 'brunosallesphd.kpages.online' && path === '/mapa-triagem-tdah') return rawUrl;
  } catch {
    return null;
  }
  return null;
}

function placementFor(text: string, expectedUrl: string): Placement {
  const urls = extractUrls(text);
  const legacyUrls = [...new Set(urls.map(legacyUrlFor).filter((url): url is string => Boolean(url)))];
  const currentUrls = [...new Set(urls.filter(isCurrentTrackingUrl).map((url) => url.replace(/\/+$/, '')))];

  if (legacyUrls.length === 1 && currentUrls.length === 0) {
    return { status: 'ready', legacyUrl: legacyUrls[0], expectedUrl };
  }
  if (legacyUrls.length === 0 && currentUrls.length === 1 && currentUrls[0] === expectedUrl) {
    return { status: 'already_current', legacyUrl: null, expectedUrl };
  }
  if (legacyUrls.length === 0 && currentUrls.length === 0) {
    return { status: 'missing', legacyUrl: null, expectedUrl };
  }
  return { status: 'ambiguous', legacyUrl: legacyUrls[0] || null, expectedUrl };
}

function replaceLegacyUrl(text: string, legacyUrl: string, expectedUrl: string): string {
  const replaced = text.split(legacyUrl).join(expectedUrl);
  if (replaced === text) throw new Error(`Legacy URL was not found: ${legacyUrl}`);
  return replaced;
}

function descriptionBytes(description: string): number {
  return new TextEncoder().encode(description).length;
}

function fitDescriptionByteLimit(description: string): {
  description: string;
  originalBytes: number;
  finalBytes: number;
  separatorCharactersTrimmed: number;
} {
  const originalBytes = descriptionBytes(description);
  let fitted = description;
  let separatorCharactersTrimmed = 0;

  while (descriptionBytes(fitted) > DESCRIPTION_MAX_BYTES) {
    const separators = fitted.match(/^_{20,}$/gm) || [];
    const removable = separators.reduce(
      (total, separator) => total + Math.max(0, separator.length - MIN_SEPARATOR_LENGTH),
      0,
    );
    const excessBytes = descriptionBytes(fitted) - DESCRIPTION_MAX_BYTES;
    assert(removable >= excessBytes,
      `Description exceeds ${DESCRIPTION_MAX_BYTES} bytes and cannot be compacted using separators.`);
    const reductionPerSeparator = Math.ceil(excessBytes / separators.length);
    fitted = fitted.replace(/^_{20,}$/gm, (separator) => {
      const reduction = Math.min(
        reductionPerSeparator,
        Math.max(0, separator.length - MIN_SEPARATOR_LENGTH),
      );
      separatorCharactersTrimmed += reduction;
      return separator.slice(0, separator.length - reduction);
    });
  }

  return {
    description: fitted,
    originalBytes,
    finalBytes: descriptionBytes(fitted),
    separatorCharactersTrimmed,
  };
}

function writableSnippet(
  snippet: youtube_v3.Schema$VideoSnippet,
  description: string,
): youtube_v3.Schema$VideoSnippet {
  const next: youtube_v3.Schema$VideoSnippet = {
    title: snippet.title || '',
    description,
    categoryId: snippet.categoryId || '',
  };
  if (snippet.tags) next.tags = [...snippet.tags];
  if (snippet.defaultLanguage) next.defaultLanguage = snippet.defaultLanguage;
  return next;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function checkRedirects(urls: string[]): Promise<Map<string, boolean>> {
  const uniqueUrls = [...new Set(urls)];
  const results = new Map<string, boolean>();
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < uniqueUrls.length) {
      const url = uniqueUrls[nextIndex];
      nextIndex += 1;
      try {
        const response = await fetch(url, { method: 'HEAD', redirect: 'manual' });
        results.set(url, response.status === 302 && Boolean(response.headers.get('location')));
      } catch {
        results.set(url, false);
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
    quota.reads += 1;
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
    quota.reads += 1;
    for (const item of response.data.items || []) {
      if (!item.id || !item.snippet) continue;
      videos.push({
        videoId: item.id,
        title: item.snippet.title || '',
        durationSeconds: parseDurationSeconds(item.contentDetails?.duration || ''),
        publishedAt: item.snippet.publishedAt || '',
        snippet: item.snippet,
      });
    }
  }
  return videos;
}

async function searchOwnComments(
  youtube: youtube_v3.Youtube,
  channelId: string,
): Promise<CommentCandidate[]> {
  const comments: CommentCandidate[] = [];
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
      quota.reads += 1;
      for (const item of response.data.items || []) {
        const videoId = item.snippet?.videoId;
        const topLevel = item.snippet?.topLevelComment;
        const snippet = topLevel?.snippet;
        const authorChannelId = snippet?.authorChannelId?.value || '';
        if (!videoId || !topLevel?.id || !snippet || authorChannelId !== channelId) continue;
        const text = snippet.textOriginal || snippet.textDisplay || '';
        if (!extractUrls(text).some((url) => legacyUrlFor(url) || isCurrentTrackingUrl(url))) continue;
        comments.push({ id: topLevel.id, videoId, text, authorChannelId });
      }
      pageToken = response.data.nextPageToken || undefined;
    } while (pageToken);
  }
  return [...new Map(comments.map((comment) => [comment.id, comment])).values()];
}

async function readVideo(youtube: youtube_v3.Youtube, videoId: string): Promise<youtube_v3.Schema$VideoSnippet> {
  const response = await youtube.videos.list({ part: ['snippet'], id: [videoId] });
  quota.reads += 1;
  const snippet = response.data.items?.[0]?.snippet;
  if (!snippet) throw new Error(`Video not found during verification: ${videoId}`);
  return snippet;
}

async function readComment(youtube: youtube_v3.Youtube, commentId: string): Promise<CommentCandidate> {
  const response = await youtube.comments.list({ part: ['snippet'], id: [commentId], textFormat: 'plainText' });
  quota.reads += 1;
  const comment = response.data.items?.[0];
  const snippet = comment?.snippet;
  if (!comment?.id || !snippet) throw new Error(`Comment not found during verification: ${commentId}`);
  return {
    id: comment.id,
    videoId: '',
    text: snippet.textOriginal || snippet.textDisplay || '',
    authorChannelId: snippet.authorChannelId?.value || '',
  };
}

async function waitForVideoDescription(
  youtube: youtube_v3.Youtube,
  videoId: string,
  expectedDescription: string,
): Promise<number> {
  for (let attempt = 1; attempt <= VERIFY_ATTEMPTS; attempt += 1) {
    const current = await readVideo(youtube, videoId);
    if ((current.description || '') === expectedDescription) return attempt;
    if (attempt < VERIFY_ATTEMPTS) await sleep(VERIFY_DELAY_MS);
  }
  throw new Error(`Video description did not converge after ${VERIFY_ATTEMPTS} reads: ${videoId}`);
}

async function waitForCommentText(
  youtube: youtube_v3.Youtube,
  commentId: string,
  expectedText: string,
): Promise<number> {
  for (let attempt = 1; attempt <= VERIFY_ATTEMPTS; attempt += 1) {
    const current = await readComment(youtube, commentId);
    if (current.text === expectedText) return attempt;
    if (attempt < VERIFY_ATTEMPTS) await sleep(VERIFY_DELAY_MS);
  }
  throw new Error(`Comment text did not converge after ${VERIFY_ATTEMPTS} reads: ${commentId}`);
}

async function updateVideoDescription(
  youtube: youtube_v3.Youtube,
  videoId: string,
  originalSnippet: youtube_v3.Schema$VideoSnippet,
  description: string,
): Promise<number> {
  const response = await youtube.videos.update({
    part: ['snippet'],
    requestBody: { id: videoId, snippet: writableSnippet(originalSnippet, description) },
  });
  quota.writes += 50;
  assert(response.data.snippet?.description === description, `Unexpected videos.update response: ${videoId}`);
  return waitForVideoDescription(youtube, videoId, description);
}

async function updateCommentText(
  youtube: youtube_v3.Youtube,
  commentId: string,
  text: string,
): Promise<number> {
  const response = await youtube.comments.update({
    part: ['snippet'],
    requestBody: { id: commentId, snippet: { textOriginal: text } },
  });
  quota.writes += 50;
  assert(response.data.snippet?.textOriginal === text, `Unexpected comments.update response: ${commentId}`);
  return waitForCommentText(youtube, commentId, text);
}

async function rollbackVideo(
  youtube: youtube_v3.Youtube,
  videoId: string,
  originalSnippet: youtube_v3.Schema$VideoSnippet,
  attemptedDescription: string,
): Promise<string> {
  const current = await readVideo(youtube, videoId);
  const currentDescription = current.description || '';
  const originalDescription = originalSnippet.description || '';
  if (currentDescription === originalDescription) return 'already_original';
  if (currentDescription !== attemptedDescription) throw new Error(`Video rollback conflict: ${videoId}`);
  await youtube.videos.update({
    part: ['snippet'],
    requestBody: { id: videoId, snippet: writableSnippet(originalSnippet, originalDescription) },
  });
  quota.writes += 50;
  await waitForVideoDescription(youtube, videoId, originalDescription);
  return 'restored';
}

async function rollbackComment(
  youtube: youtube_v3.Youtube,
  commentId: string,
  originalText: string,
  attemptedText: string,
): Promise<string> {
  const current = await readComment(youtube, commentId);
  if (current.text === originalText) return 'already_original';
  if (current.text !== attemptedText) throw new Error(`Comment rollback conflict: ${commentId}`);
  await youtube.comments.update({
    part: ['snippet'],
    requestBody: { id: commentId, snippet: { textOriginal: originalText } },
  });
  quota.writes += 50;
  await waitForCommentText(youtube, commentId, originalText);
  return 'restored';
}

function statusCounts(rows: BatchRow[], placement: 'description' | 'comment') {
  return Object.fromEntries(['ready', 'already_current', 'missing', 'ambiguous'].map((status) => [
    status,
    rows.filter((row) => row[placement].status === status).length,
  ])) as Record<PlacementStatus, number>;
}

async function buildPreflight(youtube: youtube_v3.Youtube) {
  const channelResponse = await youtube.channels.list({ part: ['snippet', 'contentDetails'], mine: true });
  quota.reads += 1;
  const channel = channelResponse.data.items?.[0];
  const channelId = channel?.id;
  const uploadsPlaylistId = channel?.contentDetails?.relatedPlaylists?.uploads;
  assert(channelId === EXPECTED_CHANNEL_ID, `Authorized channel mismatch: ${channelId || 'none'}`);
  assert(uploadsPlaylistId, 'Uploads playlist could not be resolved.');

  const uploadVideoIds = await listUploadVideoIds(youtube, uploadsPlaylistId);
  const allVideos = await listVideos(youtube, uploadVideoIds);
  const eligibleVideos = allVideos
    .filter((video) => video.durationSeconds > SHORT_MAX_SECONDS)
    .sort((left, right) => right.publishedAt.localeCompare(left.publishedAt));
  const eligibleIds = new Set(eligibleVideos.map((video) => video.videoId));
  const comments = (await searchOwnComments(youtube, channelId))
    .filter((comment) => eligibleIds.has(comment.videoId));

  const rows: BatchRow[] = eligibleVideos.map((video) => {
    const expectedDescriptionUrl = trackingUrl(video.videoId, 'd');
    const expectedCommentUrl = trackingUrl(video.videoId, 'c');
    const candidates = comments.filter((comment) => comment.videoId === video.videoId);
    let commentPlacement: Placement;
    if (candidates.length === 0) {
      commentPlacement = { status: 'missing', legacyUrl: null, expectedUrl: expectedCommentUrl };
    } else if (candidates.length === 1) {
      commentPlacement = placementFor(candidates[0].text, expectedCommentUrl);
    } else {
      commentPlacement = { status: 'ambiguous', legacyUrl: null, expectedUrl: expectedCommentUrl };
    }
    return {
      video,
      description: placementFor(video.snippet.description || '', expectedDescriptionUrl),
      comment: { ...commentPlacement, candidate: candidates.length === 1 ? candidates[0] : null },
    };
  });

  const descriptionCounts = statusCounts(rows, 'description');
  const commentCounts = statusCounts(rows, 'comment');
  assert(eligibleVideos.length === EXPECTED_ELIGIBLE_VIDEOS,
    `Eligible video count changed: expected ${EXPECTED_ELIGIBLE_VIDEOS}, got ${eligibleVideos.length}`);
  assert(descriptionCounts.ready + descriptionCounts.already_current === EXPECTED_ELIGIBLE_VIDEOS,
    `Description scope is not clean: ${JSON.stringify(descriptionCounts)}`);
  assert(descriptionCounts.missing === 0 && descriptionCounts.ambiguous === 0,
    `Descriptions contain missing or ambiguous placements: ${JSON.stringify(descriptionCounts)}`);
  assert(commentCounts.ready + commentCounts.already_current === EXPECTED_TARGET_COMMENTS,
    `Comment scope is not clean: ${JSON.stringify(commentCounts)}`);
  assert(commentCounts.missing === EXPECTED_MISSING_COMMENTS && commentCounts.ambiguous === 0,
    `Comments contain unexpected missing or ambiguous placements: ${JSON.stringify(commentCounts)}`);

  const redirectUrls = rows.flatMap((row) => [row.description.expectedUrl, row.comment.expectedUrl]);
  const redirectChecks = await checkRedirects(redirectUrls);
  const unhealthyRedirects = [...redirectChecks.entries()].filter(([, healthy]) => !healthy).map(([url]) => url);
  assert(redirectChecks.size === EXPECTED_ELIGIBLE_VIDEOS * 2,
    `Redirect scope changed: expected ${EXPECTED_ELIGIBLE_VIDEOS * 2}, got ${redirectChecks.size}`);
  assert(unhealthyRedirects.length === 0, `Unhealthy redirects: ${unhealthyRedirects.join(', ')}`);

  return {
    channel: {
      id: channelId,
      title: channel.snippet?.title || '',
      customUrl: channel.snippet?.customUrl || '',
    },
    allVideos,
    rows,
    descriptionCounts,
    commentCounts,
    redirectChecks,
  };
}

async function main() {
  const oauth = new google.auth.OAuth2(
    requireEnv('YOUTUBE_CLIENT_ID'),
    requireEnv('YOUTUBE_CLIENT_SECRET'),
    'http://localhost:3000/callback',
  );
  oauth.setCredentials({ refresh_token: requireEnv('YOUTUBE_REFRESH_TOKEN') });
  const youtube = google.youtube({ version: 'v3', auth: oauth });

  const preflight = await buildPreflight(youtube);
  const writeRows = preflight.rows.filter((row) => (
    row.description.status === 'ready' || row.comment.status === 'ready'
  ));
  const descriptionCompactions = preflight.rows
    .filter((row) => row.description.status === 'ready')
    .map((row) => {
      const replaced = replaceLegacyUrl(
        row.video.snippet.description || '',
        row.description.legacyUrl!,
        row.description.expectedUrl,
      );
      const fitted = fitDescriptionByteLimit(replaced);
      return {
        videoId: row.video.videoId,
        title: row.video.title,
        originalBytes: fitted.originalBytes,
        finalBytes: fitted.finalBytes,
        separatorCharactersTrimmed: fitted.separatorCharactersTrimmed,
      };
    })
    .filter((item) => item.separatorCharactersTrimmed > 0);
  const missingComments = preflight.rows
    .filter((row) => row.comment.status === 'missing')
    .map((row) => ({ videoId: row.video.videoId, title: row.video.title }));

  console.log(JSON.stringify({
    event: 'preflight_passed',
    mode: APPLY ? 'apply' : 'dry-run',
    channel: preflight.channel,
    scope: {
      uploadVideos: preflight.allVideos.length,
      eligibleNonShortVideos: preflight.rows.length,
      shortsExcluded: preflight.allVideos.length - preflight.rows.length,
      descriptions: preflight.descriptionCounts,
      comments: preflight.commentCounts,
      redirectsHealthy: [...preflight.redirectChecks.values()].filter(Boolean).length,
      videosWithWrites: writeRows.length,
      descriptionsRequiringSeparatorCompaction: descriptionCompactions.length,
    },
    descriptionCompactions,
    missingComments,
    estimatedQuotaUnitsSoFar: quota,
  }));

  if (!APPLY) {
    console.log(JSON.stringify({
      ok: true,
      mode: 'dry-run',
      writesPerformed: 0,
      planned: {
        descriptions: preflight.descriptionCounts.ready,
        comments: preflight.commentCounts.ready,
      },
      estimatedQuotaUnits: quota,
    }, null, 2));
    return;
  }

  const completed: Array<{
    videoId: string;
    descriptionUpdated: boolean;
    commentUpdated: boolean;
    descriptionVerifyAttempt: number | null;
    commentVerifyAttempt: number | null;
    separatorCharactersTrimmed: number;
  }> = [];

  for (const [index, row] of writeRows.entries()) {
    const descriptionReady = row.description.status === 'ready';
    const commentReady = row.comment.status === 'ready';
    const initialSnippet = row.video.snippet;
    const initialDescription = initialSnippet.description || '';
    const initialComment = row.comment.candidate;
    const nextDescriptionResult = descriptionReady
      ? fitDescriptionByteLimit(
        replaceLegacyUrl(initialDescription, row.description.legacyUrl!, row.description.expectedUrl),
      )
      : fitDescriptionByteLimit(initialDescription);
    const nextDescription = nextDescriptionResult.description;
    const nextCommentText = commentReady
      ? replaceLegacyUrl(initialComment!.text, row.comment.legacyUrl!, row.comment.expectedUrl)
      : null;
    let videoAttempted = false;
    let commentAttempted = false;
    let descriptionVerifyAttempt: number | null = null;
    let commentVerifyAttempt: number | null = null;

    try {
      if (descriptionReady) {
        const currentSnippet = await readVideo(youtube, row.video.videoId);
        assert((currentSnippet.description || '') === initialDescription,
          `Description changed after preflight: ${row.video.videoId}`);
      }
      if (commentReady) {
        assert(initialComment, `Comment candidate disappeared from plan: ${row.video.videoId}`);
        const currentComment = await readComment(youtube, initialComment.id);
        assert(currentComment.authorChannelId === EXPECTED_CHANNEL_ID,
          `Comment author changed after preflight: ${initialComment.id}`);
        assert(currentComment.text === initialComment.text,
          `Comment changed after preflight: ${initialComment.id}`);
      }

      if (descriptionReady) {
        videoAttempted = true;
        descriptionVerifyAttempt = await updateVideoDescription(
          youtube,
          row.video.videoId,
          initialSnippet,
          nextDescription,
        );
      }
      if (commentReady && initialComment && nextCommentText !== null) {
        commentAttempted = true;
        commentVerifyAttempt = await updateCommentText(youtube, initialComment.id, nextCommentText);
      }

      completed.push({
        videoId: row.video.videoId,
        descriptionUpdated: descriptionReady,
        commentUpdated: commentReady,
        descriptionVerifyAttempt,
        commentVerifyAttempt,
        separatorCharactersTrimmed: nextDescriptionResult.separatorCharactersTrimmed,
      });
      if ((index + 1) % 5 === 0 || index + 1 === writeRows.length) {
        console.log(JSON.stringify({
          event: 'progress',
          completedVideos: index + 1,
          totalVideos: writeRows.length,
          descriptionsUpdated: completed.filter((item) => item.descriptionUpdated).length,
          commentsUpdated: completed.filter((item) => item.commentUpdated).length,
          estimatedQuotaUnits: quota,
        }));
      }
    } catch (error) {
      const rollback: Record<string, string> = {};
      try {
        if (commentAttempted && initialComment && nextCommentText !== null) {
          rollback.comment = await rollbackComment(youtube, initialComment.id, initialComment.text, nextCommentText);
        }
      } catch (rollbackError) {
        rollback.comment = `failed: ${rollbackError instanceof Error ? rollbackError.message : 'unknown error'}`;
      }
      try {
        if (videoAttempted) {
          rollback.video = await rollbackVideo(youtube, row.video.videoId, initialSnippet, nextDescription);
        }
      } catch (rollbackError) {
        rollback.video = `failed: ${rollbackError instanceof Error ? rollbackError.message : 'unknown error'}`;
      }

      console.error(JSON.stringify({
        ok: false,
        event: 'batch_stopped',
        failedVideo: { videoId: row.video.videoId, title: row.video.title },
        error: error instanceof Error ? error.message : 'Unknown error',
        rollback,
        completed,
        estimatedQuotaUnits: quota,
      }, null, 2));
      process.exitCode = 1;
      return;
    }
  }

  console.log(JSON.stringify({
    ok: true,
    mode: 'apply',
    completedAt: new Date().toISOString(),
    channel: preflight.channel,
    result: {
      videosProcessed: completed.length,
      descriptionsUpdated: completed.filter((item) => item.descriptionUpdated).length,
      commentsUpdated: completed.filter((item) => item.commentUpdated).length,
      alreadyCurrentDescriptions: preflight.descriptionCounts.already_current,
      alreadyCurrentComments: preflight.commentCounts.already_current,
      missingComments,
      rollbacks: 0,
    },
    verification: {
      descriptionMaxAttempt: Math.max(0, ...completed.map((item) => item.descriptionVerifyAttempt || 0)),
      commentMaxAttempt: Math.max(0, ...completed.map((item) => item.commentVerifyAttempt || 0)),
      descriptionsCompacted: completed.filter((item) => item.separatorCharactersTrimmed > 0).length,
      separatorCharactersTrimmed: completed.reduce(
        (total, item) => total + item.separatorCharactersTrimmed,
        0,
      ),
    },
    estimatedQuotaUnits: quota,
  }, null, 2));
}

main().catch((error: unknown) => {
  console.error(JSON.stringify({
    ok: false,
    mode: APPLY ? 'apply' : 'dry-run',
    error: error instanceof Error ? error.message : 'Unknown error',
    estimatedQuotaUnits: quota,
  }, null, 2));
  process.exitCode = 1;
});
