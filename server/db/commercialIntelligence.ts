import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  CommercialIntelligenceError,
  type ApplyHotmartEventResult,
  type CommercialIntelligenceRepository,
  type HotmartEventRecord,
  type HotmartTransactionRecord,
  type SyncRunRecord,
  type SyncRunUpdate,
  type YoutubeDailyRecord,
  type YoutubeVideoRecord,
  type YoutubeVideoStatsRecord,
} from '../services/commercial-intelligence/contracts.js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vdaualgktroizsttbrfh.supabase.co';
const SUPABASE_SERVER_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';

function databaseError(operation: string, error: { message?: string } | null): CommercialIntelligenceError {
  const wrapped = new CommercialIntelligenceError(
    'database_error',
    `Falha de persistência em ${operation}.`,
    503,
  );
  if (error?.message) {
    Object.defineProperty(wrapped, 'cause', {
      value: new Error(error.message),
      enumerable: false,
    });
  }
  return wrapped;
}

export class SupabaseCommercialIntelligenceRepository implements CommercialIntelligenceRepository {
  readonly configured = Boolean(SUPABASE_URL && SUPABASE_SERVER_KEY);
  private readonly client: SupabaseClient | null;

  constructor(client?: SupabaseClient) {
    this.client = client || (this.configured
      ? createClient(SUPABASE_URL, SUPABASE_SERVER_KEY, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : null);
  }

  private db(): SupabaseClient {
    if (!this.client) {
      throw new CommercialIntelligenceError(
        'database_not_configured',
        'Banco da Inteligência Comercial não configurado.',
        503,
      );
    }
    return this.client;
  }

  async applyHotmartEvent(
    event: HotmartEventRecord,
    transaction: HotmartTransactionRecord,
  ): Promise<ApplyHotmartEventResult> {
    const { data, error } = await this.db().rpc('ci_apply_hotmart_event', {
      p_event: event,
      p_transaction: transaction,
    });
    if (error) throw databaseError('ci_apply_hotmart_event', error);

    const row = Array.isArray(data) ? data[0] : data;
    return {
      insertedEvent: Boolean(row?.inserted_event),
      updatedTransaction: Boolean(row?.updated_transaction),
      repairedTransaction: Boolean(row?.repaired_transaction),
    };
  }

  async listYoutubeVideoIds(): Promise<string[]> {
    const ids: string[] = [];
    let offset = 0;
    const pageSize = 1000;
    while (true) {
      const { data, error } = await this.db()
        .from('ci_youtube_videos')
        .select('video_id')
        .order('video_id', { ascending: true })
        .range(offset, offset + pageSize - 1);
      if (error) throw databaseError('listYoutubeVideoIds', error);
      for (const row of data || []) ids.push(String(row.video_id));
      if (!data || data.length < pageSize) break;
      offset += pageSize;
    }
    return ids;
  }

  async upsertYoutubeVideos(rows: YoutubeVideoRecord[]): Promise<number> {
    if (!rows.length) return 0;
    const { error } = await this.db()
      .from('ci_youtube_videos')
      .upsert(rows, { onConflict: 'video_id' });
    if (error) throw databaseError('upsertYoutubeVideos', error);
    return rows.length;
  }

  // Só atualiza o total de vida de vídeo já catalogado (UPDATE via função do
  // banco; upsert parcial esbarra no title NOT NULL do INSERT do ON CONFLICT).
  async upsertYoutubeVideoStats(rows: YoutubeVideoStatsRecord[]): Promise<number> {
    if (!rows.length) return 0;
    const { data, error } = await this.db().rpc('ci_update_youtube_video_stats', { p_rows: rows });
    if (error) throw databaseError('ci_update_youtube_video_stats', error);
    return Number(data) || 0;
  }

  async upsertYoutubeDaily(rows: YoutubeDailyRecord[]): Promise<number> {
    if (!rows.length) return 0;
    const { error } = await this.db()
      .from('ci_youtube_daily')
      .upsert(rows, { onConflict: 'video_id,metric_date' });
    if (error) throw databaseError('upsertYoutubeDaily', error);
    return rows.length;
  }

  async createSyncRun(run: SyncRunRecord): Promise<void> {
    const { error } = await this.db().from('ci_sync_runs').insert(run);
    if (error) throw databaseError('createSyncRun', error);
  }

  async finishSyncRun(runId: string, update: SyncRunUpdate): Promise<void> {
    const { error } = await this.db()
      .from('ci_sync_runs')
      .update(update)
      .eq('run_id', runId);
    if (error) throw databaseError('finishSyncRun', error);
  }

  async getLatestSyncRuns(): Promise<SyncRunRecord[]> {
    const { data, error } = await this.db()
      .from('ci_sync_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(50);
    if (error) throw databaseError('getLatestSyncRuns', error);

    const latest = new Map<SyncRunRecord['source'], SyncRunRecord>();
    for (const row of (data || []) as SyncRunRecord[]) {
      if (!latest.has(row.source)) latest.set(row.source, row);
    }
    return [...latest.values()];
  }

  async getYoutubeMetricDates(startDate: string, endDate: string): Promise<string[]> {
    const dates = new Set<string>();
    let offset = 0;
    const pageSize = 1000;

    while (true) {
      const { data, error } = await this.db()
        .from('ci_youtube_daily')
        .select('metric_date')
        .gte('metric_date', startDate)
        .lte('metric_date', endDate)
        .order('metric_date', { ascending: true })
        .range(offset, offset + pageSize - 1);
      if (error) throw databaseError('getYoutubeMetricDates', error);

      for (const row of data || []) dates.add(String(row.metric_date));
      if (!data || data.length < pageSize) break;
      offset += pageSize;
    }

    return [...dates].sort();
  }
}

export const commercialIntelligenceRepository = new SupabaseCommercialIntelligenceRepository();
