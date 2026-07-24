import { CommercialIntelligenceError } from './errors.ts';
import type {
  ApplyHotmartEventResult,
  EdgeRepository,
  HotmartEventRecord,
  HotmartTransactionRecord,
  SyncRunRecord,
  SyncRunUpdate,
  YoutubeDailyRecord,
  YoutubeVideoRecord,
} from './types.ts';

type SupabaseLike = any;

function databaseError(operation: string, error?: { message?: string } | null): CommercialIntelligenceError {
  const wrapped = new CommercialIntelligenceError('database_error', `Falha de persistência em ${operation}.`, 503);
  if (error?.message) Object.defineProperty(wrapped, 'cause', { value: new Error(error.message), enumerable: false });
  return wrapped;
}

export class SupabaseEdgeRepository implements EdgeRepository {
  constructor(private readonly client: SupabaseLike) {}

  async applyHotmartEvent(event: HotmartEventRecord, transaction: HotmartTransactionRecord): Promise<ApplyHotmartEventResult> {
    const { data, error } = await this.client.rpc('ci_apply_hotmart_event', {
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

  async upsertYoutubeVideos(rows: YoutubeVideoRecord[]): Promise<number> {
    if (!rows.length) return 0;
    const { error } = await this.client.from('ci_youtube_videos').upsert(rows, { onConflict: 'video_id' });
    if (error) throw databaseError('upsertYoutubeVideos', error);
    return rows.length;
  }

  async upsertYoutubeDaily(rows: YoutubeDailyRecord[]): Promise<number> {
    if (!rows.length) return 0;
    const { error } = await this.client.from('ci_youtube_daily').upsert(rows, { onConflict: 'video_id,metric_date' });
    if (error) throw databaseError('upsertYoutubeDaily', error);
    return rows.length;
  }

  async createSyncRun(run: SyncRunRecord): Promise<void> {
    const { error } = await this.client.from('ci_sync_runs').insert(run);
    if (error) throw databaseError('createSyncRun', error);
  }

  async finishSyncRun(runId: string, update: SyncRunUpdate): Promise<void> {
    const { error } = await this.client.from('ci_sync_runs').update(update).eq('run_id', runId);
    if (error) throw databaseError('finishSyncRun', error);
  }

  async getLatestSyncRuns(): Promise<SyncRunRecord[]> {
    const { data, error } = await this.client
      .from('ci_sync_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(50);
    if (error) throw databaseError('getLatestSyncRuns', error);
    const latest = new Map<SyncRunRecord['source'], SyncRunRecord>();
    for (const row of (data || []) as SyncRunRecord[]) if (!latest.has(row.source)) latest.set(row.source, row);
    return [...latest.values()];
  }

  async getYoutubeMetricDates(startDate: string, endDate: string): Promise<string[]> {
    const dates = new Set<string>();
    let offset = 0;
    const pageSize = 1000;
    while (true) {
      const { data, error } = await this.client
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

  async acquireLock(source: 'youtube' | 'hotmart_reconciliation', ownerId: string): Promise<boolean> {
    const { data, error } = await this.client.rpc('ci_acquire_sync_lock', {
      p_source: source,
      p_owner_id: ownerId,
      p_ttl_seconds: 140,
    });
    if (error) throw databaseError('ci_acquire_sync_lock', error);
    return Boolean(data);
  }

  async releaseLock(source: 'youtube' | 'hotmart_reconciliation', ownerId: string): Promise<void> {
    const { error } = await this.client.rpc('ci_release_sync_lock', {
      p_source: source,
      p_owner_id: ownerId,
    });
    if (error) throw databaseError('ci_release_sync_lock', error);
  }
}
