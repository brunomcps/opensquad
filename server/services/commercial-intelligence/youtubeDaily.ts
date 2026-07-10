import { randomUUID } from 'crypto';
import { youtube, youtubeAnalytics } from '../youtubeClient.js';
import {
  CommercialIntelligenceError,
  type CommercialIntelligenceRepository,
  type SyncRunRecord,
  type YoutubeDailyRecord,
  type YoutubeVideoRecord,
} from './contracts.js';
import { defaultDateRange, enumerateDates, validateDateRange } from './dateRange.js';

export interface YoutubeReportHeader {
  name?: string | null;
}

export interface YoutubeReport {
  columnHeaders?: YoutubeReportHeader[] | null;
  rows?: unknown[][] | null;
}

export type YoutubeReportReader = (input: {
  startDate: string;
  endDate: string;
  startIndex: number;
  maxResults: number;
}) => Promise<YoutubeReport>;

export type YoutubeMetadataReader = (videoIds: string[]) => Promise<unknown[]>;

function numeric(value: unknown, fallback: number | null): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function parseYoutubeDailyReport(
  report: YoutubeReport,
  fetchedAt: string,
): YoutubeDailyRecord[] {
  const names = (report.columnHeaders || []).map(header => header.name || '');
  const required = ['day', 'video', 'views', 'estimatedMinutesWatched'];
  for (const column of required) {
    if (!names.includes(column)) {
      throw new CommercialIntelligenceError(
        'youtube_report_contract_changed',
        `Resposta do YouTube sem a coluna obrigatória ${column}.`,
        502,
      );
    }
  }

  return (report.rows || []).map(row => {
    const values = Object.fromEntries(names.map((name, index) => [name, row[index]]));
    const videoId = text(values.video);
    const metricDate = text(values.day);
    if (!videoId || !metricDate) {
      throw new CommercialIntelligenceError(
        'youtube_report_invalid_row',
        'Resposta do YouTube contém linha sem vídeo ou dia.',
        502,
      );
    }
    return {
      video_id: videoId,
      metric_date: metricDate,
      views: numeric(values.views, 0) || 0,
      estimated_minutes_watched: numeric(values.estimatedMinutesWatched, 0) || 0,
      likes: numeric(values.likes, null),
      comments: numeric(values.comments, null),
      shares: numeric(values.shares, null),
      subscribers_gained: numeric(values.subscribersGained, null),
      subscribers_lost: numeric(values.subscribersLost, null),
      source_updated_at: fetchedAt,
    };
  });
}

export function parseIsoDuration(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const match = value.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return null;
  return Number(match[1] || 0) * 86_400
    + Number(match[2] || 0) * 3_600
    + Number(match[3] || 0) * 60
    + Number(match[4] || 0);
}

function record(value: unknown): Record<string, any> {
  return value && typeof value === 'object' ? value as Record<string, any> : {};
}

export function parseYoutubeVideoMetadata(
  items: unknown[],
  fetchedAt: string,
): YoutubeVideoRecord[] {
  return items.flatMap(itemValue => {
    const item = record(itemValue);
    const videoId = text(item.id);
    if (!videoId) return [];
    const snippet = record(item.snippet);
    const contentDetails = record(item.contentDetails);
    const thumbnails = record(snippet.thumbnails);
    const durationSeconds = parseIsoDuration(contentDetails.duration);
    const isLive = Boolean(item.liveStreamingDetails)
      || ['live', 'upcoming'].includes(String(snippet.liveBroadcastContent || '').toLowerCase());
    const contentType: YoutubeVideoRecord['content_type'] = isLive
      ? 'live'
      : durationSeconds === null
        ? 'unknown'
        : durationSeconds <= 180
          ? 'short'
          : 'long';
    const thumbnail = ['maxres', 'standard', 'high', 'medium', 'default']
      .map(key => text(record(thumbnails[key]).url))
      .find(Boolean) || null;

    return [{
      video_id: videoId,
      title: text(snippet.title) || videoId,
      published_at: text(snippet.publishedAt),
      duration_seconds: durationSeconds,
      content_type: contentType,
      thumbnail_url: thumbnail,
      metadata_refreshed_at: fetchedAt,
    }];
  });
}

async function defaultReportReader(input: {
  startDate: string;
  endDate: string;
  startIndex: number;
  maxResults: number;
}): Promise<YoutubeReport> {
  const response = await youtubeAnalytics.reports.query({
    ids: 'channel==MINE',
    startDate: input.startDate,
    endDate: input.endDate,
    dimensions: 'day,video',
    metrics: 'views,estimatedMinutesWatched,likes,comments,shares,subscribersGained,subscribersLost',
    sort: 'day,video',
    startIndex: input.startIndex,
    maxResults: input.maxResults,
  });
  return response.data as YoutubeReport;
}

async function defaultMetadataReader(videoIds: string[]): Promise<unknown[]> {
  const response = await youtube.videos.list({
    part: ['snippet', 'contentDetails', 'liveStreamingDetails'],
    id: videoIds,
  });
  return response.data.items || [];
}

export interface SyncYoutubeDailyInput {
  repository: CommercialIntelligenceRepository;
  startDate?: string;
  endDate?: string;
  readReport?: YoutubeReportReader;
  readMetadata?: YoutubeMetadataReader;
  now?: Date;
}

export interface SyncYoutubeDailyResult {
  runId: string;
  status: 'success' | 'partial';
  rowsRead: number;
  rowsWritten: number;
  videosWritten: number;
  sourceWatermark: string | null;
  warnings: string[];
}

export async function syncYoutubeDaily(input: SyncYoutubeDailyInput): Promise<SyncYoutubeDailyResult> {
  const now = input.now || new Date();
  const defaults = defaultDateRange(35, now);
  const range = validateDateRange(
    input.startDate || defaults.startDate,
    input.endDate || defaults.endDate,
  );
  const readReport = input.readReport || defaultReportReader;
  const readMetadata = input.readMetadata || defaultMetadataReader;
  const runId = randomUUID();
  const run: SyncRunRecord = {
    run_id: runId,
    source: 'youtube',
    job_type: 'day_video',
    status: 'running',
    requested_start: range.startDate,
    requested_end: range.endDate,
    source_watermark: null,
    rows_read: 0,
    rows_written: 0,
    rows_skipped: 0,
    repairs: 0,
    warnings: [],
    error_code: null,
    error_message: null,
    started_at: now.toISOString(),
    finished_at: null,
  };
  await input.repository.createSyncRun(run);

  const maxResults = 200;
  let startIndex = 1;
  const rows: YoutubeDailyRecord[] = [];
  const warningSet = new Set<string>();

  try {
    while (true) {
      const report = await readReport({
        startDate: range.startDate,
        endDate: range.endDate,
        startIndex,
        maxResults,
      });
      const parsed = parseYoutubeDailyReport(report, now.toISOString());
      rows.push(...parsed);
      if (parsed.length < maxResults) break;
      startIndex += parsed.length;
    }

    const videoIds = [...new Set(rows.map(row => row.video_id))];
    const metadata: YoutubeVideoRecord[] = [];
    for (let offset = 0; offset < videoIds.length; offset += 50) {
      const batch = videoIds.slice(offset, offset + 50);
      const items = await readMetadata(batch);
      metadata.push(...parseYoutubeVideoMetadata(items, now.toISOString()));
    }

    const metadataIds = new Set(metadata.map(video => video.video_id));
    const missingMetadata = videoIds.filter(videoId => !metadataIds.has(videoId));
    if (missingMetadata.length) {
      warningSet.add(`youtube_metadata_missing:${missingMetadata.length}`);
      metadata.push(...missingMetadata.map(videoId => ({
        video_id: videoId,
        title: videoId,
        published_at: null,
        duration_seconds: null,
        content_type: 'unknown' as const,
        thumbnail_url: null,
        metadata_refreshed_at: now.toISOString(),
      })));
    }

    const dates = [...new Set(rows.map(row => row.metric_date))].sort();
    const expectedDates = enumerateDates(range.startDate, range.endDate);
    const missingDates = expectedDates.filter(date => !dates.includes(date));
    if (missingDates.length) {
      warningSet.add(`youtube_missing_days:${missingDates.length}`);
    }
    const sourceWatermark = dates.at(-1) || null;
    const videosWritten = await input.repository.upsertYoutubeVideos(metadata);
    const rowsWritten = await input.repository.upsertYoutubeDaily(rows);
    const status = warningSet.size ? 'partial' : 'success';
    const warnings = [...warningSet];
    await input.repository.finishSyncRun(runId, {
      status,
      source_watermark: sourceWatermark,
      rows_read: rows.length,
      rows_written: rowsWritten,
      warnings,
      finished_at: now.toISOString(),
    });
    return {
      runId,
      status,
      rowsRead: rows.length,
      rowsWritten,
      videosWritten,
      sourceWatermark,
      warnings,
    };
  } catch (error) {
    await input.repository.finishSyncRun(runId, {
      status: 'failed',
      rows_read: rows.length,
      error_code: error instanceof CommercialIntelligenceError ? error.code : 'youtube_sync_failed',
      error_message: 'Falha durante a sincronização do YouTube.',
      finished_at: now.toISOString(),
    }).catch(() => undefined);
    throw error;
  }
}
