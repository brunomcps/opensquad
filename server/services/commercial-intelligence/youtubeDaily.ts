import { randomUUID } from 'crypto';
import { youtube, youtubeAnalytics } from '../youtubeClient.js';
import {
  CommercialIntelligenceError,
  type CommercialIntelligenceRepository,
  type SyncRunRecord,
  type YoutubeDailyRecord,
  type YoutubePrivacyStatus,
  type YoutubeVideoRecord,
  type YoutubeVideoStatsRecord,
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
  videoIds: string[];
}) => Promise<YoutubeReport>;

export type YoutubeMetadataReader = (videoIds: string[]) => Promise<unknown[]>;
export type YoutubeVideoIdsReader = () => Promise<string[]>;

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
    const privacy = String(record(item.status).privacyStatus || '').toLowerCase();

    return [{
      video_id: videoId,
      title: text(snippet.title) || videoId,
      published_at: text(snippet.publishedAt),
      duration_seconds: durationSeconds,
      content_type: contentType,
      thumbnail_url: thumbnail,
      privacy_status: (['public', 'unlisted', 'private'] as YoutubePrivacyStatus[]).find(value => value === privacy) || null,
      metadata_refreshed_at: fetchedAt,
    }];
  });
}

// Total de vida vem em statistics (part=statistics). Vídeo sem statistics na
// resposta fica fora da lista: nunca gravar zero por cima de um total conhecido.
export function parseYoutubeVideoStats(items: unknown[], fetchedAt: string): YoutubeVideoStatsRecord[] {
  return items.flatMap(itemValue => {
    const item = record(itemValue);
    const videoId = text(item.id);
    const statistics = record(item.statistics);
    const views = numeric(statistics.viewCount, null);
    if (!videoId || views === null) return [];
    return [{
      video_id: videoId,
      lifetime_views: views,
      lifetime_likes: numeric(statistics.likeCount, null),
      lifetime_comments: numeric(statistics.commentCount, null),
      stats_refreshed_at: fetchedAt,
    }];
  });
}

async function defaultReportReader(input: {
  startDate: string;
  endDate: string;
  startIndex: number;
  maxResults: number;
  videoIds: string[];
}): Promise<YoutubeReport> {
  const response = await youtubeAnalytics.reports.query({
    ids: 'channel==MINE',
    startDate: input.startDate,
    endDate: input.endDate,
    dimensions: 'day,video',
    filters: `video==${input.videoIds.join(',')}`,
    metrics: 'views,estimatedMinutesWatched,likes,comments,shares,subscribersGained,subscribersLost',
    sort: 'day,video',
    startIndex: input.startIndex,
    maxResults: input.maxResults,
  });
  return response.data as YoutubeReport;
}

async function defaultVideoIdsReader(): Promise<string[]> {
  const channelResponse = await youtube.channels.list({
    part: ['contentDetails'],
    mine: true,
  });
  const uploadsPlaylistId = channelResponse.data.items?.[0]
    ?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsPlaylistId) return [];

  const videoIds = new Set<string>();
  let pageToken: string | undefined;
  do {
    const response = await youtube.playlistItems.list({
      part: ['contentDetails'],
      playlistId: uploadsPlaylistId,
      maxResults: 50,
      pageToken,
    });
    for (const item of response.data.items || []) {
      const videoId = item.contentDetails?.videoId;
      if (videoId) videoIds.add(videoId);
    }
    pageToken = response.data.nextPageToken || undefined;
  } while (pageToken);
  return [...videoIds];
}

async function defaultMetadataReader(videoIds: string[]): Promise<unknown[]> {
  const response = await youtube.videos.list({
    part: ['snippet', 'contentDetails', 'liveStreamingDetails', 'status', 'statistics'],
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
  readVideoIds?: YoutubeVideoIdsReader;
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
  const readVideoIds = input.readVideoIds || defaultVideoIdsReader;
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
  const rows: YoutubeDailyRecord[] = [];
  const warningSet = new Set<string>();

  try {
    const sourceVideoIds = await readVideoIds();
    if (!sourceVideoIds.length) warningSet.add('youtube_no_uploads');

    // Um relatório POR DIA. A paginação por startIndex sobre o período inteiro
    // pulava 3 dias a cada 8 (auditoria de 18/09/2026: 14, 12 e 24 dias faltando
    // em três rodadas). Com um dia por chamada, o relatório tem no máximo uma
    // linha por vídeo e cabe numa página; o laço de startIndex fica só de guarda.
    for (const day of enumerateDates(range.startDate, range.endDate)) {
      for (let offset = 0; offset < sourceVideoIds.length; offset += 500) {
        const videoIds = sourceVideoIds.slice(offset, offset + 500);
        let startIndex = 1;
        while (true) {
          const report = await readReport({
            startDate: day,
            endDate: day,
            startIndex,
            maxResults,
            videoIds,
          });
          const parsed = parseYoutubeDailyReport(report, now.toISOString());
          rows.push(...parsed);
          if (parsed.length < maxResults) break;
          startIndex += parsed.length;
        }
      }
    }
    // Mesma combinação vídeo+dia repetida (relatório que devolve dias vizinhos)
    // fica com a última leitura, e o upsert recebe uma linha por chave.
    const uniqueRows = [...new Map(rows.map(row => [`${row.video_id}:${row.metric_date}`, row])).values()];
    rows.length = 0;
    rows.push(...uniqueRows);

    // Metadado (título, data, privacidade) e total de vida de TODOS os uploads,
    // não só dos vídeos com view no período: é isso que mantém título retitulado
    // e data de vídeo novo em dia, e substitui a tarefa semanal de views totais.
    const videoIds = [...new Set([...sourceVideoIds, ...rows.map(row => row.video_id)])];
    const metadataAll: YoutubeVideoRecord[] = [];
    const statsAll: YoutubeVideoStatsRecord[] = [];
    for (let offset = 0; offset < videoIds.length; offset += 50) {
      const batch = videoIds.slice(offset, offset + 50);
      const items = await readMetadata(batch);
      metadataAll.push(...parseYoutubeVideoMetadata(items, now.toISOString()));
      statsAll.push(...parseYoutubeVideoStats(items, now.toISOString()));
    }
    // A lista de uploads do dono traz TUDO (teste, rascunho, short antigo não
    // listado). Entra no catálogo só o que é público, o que já estava lá, ou o
    // que teve view no período. Em 18/09/2026 a primeira rodada sem este filtro
    // empurrou 45 vídeos não listados pra dentro do gerador de links.
    const existingIds = new Set(await input.repository.listYoutubeVideoIds());
    const rowIds = new Set(rows.map(row => row.video_id));
    const belongs = (videoId: string, privacy: YoutubePrivacyStatus | null) =>
      privacy === 'public' || existingIds.has(videoId) || rowIds.has(videoId);
    const metadata = metadataAll.filter(video => belongs(video.video_id, video.privacy_status));
    const stats = statsAll.filter(item => metadata.some(video => video.video_id === item.video_id));

    const metadataIds = new Set(metadata.map(video => video.video_id));
    const missingMetadata = videoIds.filter(videoId => !metadataAll.some(video => video.video_id === videoId))
      .filter(videoId => existingIds.has(videoId) || rowIds.has(videoId));
    if (missingMetadata.length) {
      warningSet.add(`youtube_metadata_missing:${missingMetadata.length}`);
      metadata.push(...missingMetadata.map(videoId => ({
        video_id: videoId,
        title: videoId,
        published_at: null,
        duration_seconds: null,
        content_type: 'unknown' as const,
        thumbnail_url: null,
        privacy_status: null,
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
    await input.repository.upsertYoutubeVideoStats(stats.filter(item => metadataIds.has(item.video_id)));
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
