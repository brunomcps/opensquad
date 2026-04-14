import { google } from 'googleapis';
import { oauth2Client, youtube } from './youtubeClient.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const youtubeAnalytics = google.youtubeAnalytics({ version: 'v2', auth: oauth2Client });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LONGOS_DIR = path.resolve(__dirname, '../../../youtube/by-video/longos');

interface VideoAnalytics {
  videoId: string;
  fetchedAt: string;
  period: { start: string; end: string };
  metrics: {
    views: number;
    estimatedMinutesWatched: number;
    averageViewDuration: number;
    averageViewPercentage: number;
    likes: number;
    comments: number;
    shares: number;
    subscribersGained: number;
    impressions?: number;
    impressionsClickThroughRate?: number;
  };
}

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Fetches YouTube Analytics data for a single video.
 */
export async function fetchVideoAnalytics(videoId: string, startDate: string): Promise<VideoAnalytics> {
  const endDate = getToday();

  // Main metrics query
  const mainResponse = await youtubeAnalytics.reports.query({
    ids: 'channel==MINE',
    startDate,
    endDate,
    metrics: 'views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,likes,comments,shares,subscribersGained',
    filters: `video==${videoId}`,
  });

  const row = mainResponse.data.rows?.[0] ?? [0, 0, 0, 0, 0, 0, 0, 0];

  const metrics: VideoAnalytics['metrics'] = {
    views: row[0] as number,
    estimatedMinutesWatched: row[1] as number,
    averageViewDuration: row[2] as number,
    averageViewPercentage: row[3] as number,
    likes: row[4] as number,
    comments: row[5] as number,
    shares: row[6] as number,
    subscribersGained: row[7] as number,
  };

  // Try to fetch impression-level metrics (may not be available via API)
  try {
    const impressionResponse = await youtubeAnalytics.reports.query({
      ids: 'channel==MINE',
      startDate,
      endDate,
      metrics: 'views,annotationClickThroughRate',
      filters: `video==${videoId}`,
    });

    // If we get annotation data, include it as a proxy indicator
    const impRow = impressionResponse.data.rows?.[0];
    if (impRow && impRow.length >= 2) {
      // annotationClickThroughRate is the closest available proxy
      // Real impressions/CTR are only available in YouTube Studio
    }
  } catch {
    // Impression-level metrics are not available via the Analytics API.
    // impressions and impressionsClickThroughRate are YouTube Studio-only.
  }

  return {
    videoId,
    fetchedAt: new Date().toISOString(),
    period: { start: startDate, end: endDate },
    metrics,
  };
}

/**
 * Fetches analytics for a video using its publishedAt date from metadata.json, then saves to disk.
 */
export async function syncVideoAnalytics(videoId: string): Promise<VideoAnalytics> {
  // Fetch publishedAt via YouTube Data API
  let startDate: string;
  try {
    const res = await youtube.videos.list({ part: ['snippet'], id: [videoId] });
    const publishedAt = res.data.items?.[0]?.snippet?.publishedAt;
    if (!publishedAt) throw new Error('Video not found on YouTube');
    startDate = publishedAt.slice(0, 10);
  } catch (err) {
    throw new Error(`Cannot get publishedAt for ${videoId}: ${(err as Error).message}`);
  }

  const analytics = await fetchVideoAnalytics(videoId, startDate);

  // Save to disk
  const analyticsPath = path.join(LONGOS_DIR, videoId, 'analytics.json');
  await fs.writeFile(analyticsPath, JSON.stringify(analytics, null, 2), 'utf-8');

  return analytics;
}

/**
 * Reads cached analytics.json for a video. Returns null if not found.
 */
export async function getCachedAnalytics(videoId: string): Promise<VideoAnalytics | null> {
  const analyticsPath = path.join(LONGOS_DIR, videoId, 'analytics.json');
  try {
    const raw = await fs.readFile(analyticsPath, 'utf-8');
    return JSON.parse(raw) as VideoAnalytics;
  } catch {
    return null;
  }
}

/**
 * Syncs analytics for all videos found in the longos directory.
 * Processes sequentially to avoid API rate limits.
 */
export async function syncAllAnalytics(): Promise<{ synced: string[]; errors: Array<{ videoId: string; error: string }> }> {
  const entries = await fs.readdir(LONGOS_DIR, { withFileTypes: true });
  const videoDirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);

  const synced: string[] = [];
  const errors: Array<{ videoId: string; error: string }> = [];

  for (const videoId of videoDirs) {
    try {
      await syncVideoAnalytics(videoId);
      synced.push(videoId);
      console.log(`[analytics] synced ${videoId} (${synced.length}/${videoDirs.length})`);
    } catch (err) {
      const message = (err as Error).message;
      errors.push({ videoId, error: message });
      console.warn(`[analytics] failed ${videoId}: ${message}`);
    }
  }

  console.log(`[analytics] done: ${synced.length} synced, ${errors.length} errors`);
  return { synced, errors };
}
