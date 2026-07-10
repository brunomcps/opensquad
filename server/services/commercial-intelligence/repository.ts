import type {
  ApplyHotmartEventResult,
  CommercialIntelligenceRepository,
  HotmartEventRecord,
  HotmartTransactionRecord,
  SyncRunRecord,
  SyncRunUpdate,
  YoutubeDailyRecord,
  YoutubeVideoRecord,
} from './contracts.js';

export class InMemoryCommercialIntelligenceRepository implements CommercialIntelligenceRepository {
  readonly configured = true;
  readonly hotmartEvents = new Map<string, HotmartEventRecord>();
  readonly hotmartTransactions = new Map<string, HotmartTransactionRecord>();
  readonly youtubeVideos = new Map<string, YoutubeVideoRecord>();
  readonly youtubeDaily = new Map<string, YoutubeDailyRecord>();
  readonly syncRuns = new Map<string, SyncRunRecord>();

  async applyHotmartEvent(
    event: HotmartEventRecord,
    transaction: HotmartTransactionRecord,
  ): Promise<ApplyHotmartEventResult> {
    if (this.hotmartEvents.has(event.event_key)) {
      return { insertedEvent: false, updatedTransaction: false, repairedTransaction: false };
    }

    this.hotmartEvents.set(event.event_key, structuredClone(event));
    const current = this.hotmartTransactions.get(transaction.transaction_id);
    const shouldUpdate = !current
      || Date.parse(transaction.last_event_at) >= Date.parse(current.last_event_at);

    if (shouldUpdate) {
      this.hotmartTransactions.set(transaction.transaction_id, structuredClone(transaction));
    }

    return {
      insertedEvent: true,
      updatedTransaction: shouldUpdate,
      repairedTransaction: Boolean(current && shouldUpdate),
    };
  }

  async upsertYoutubeVideos(rows: YoutubeVideoRecord[]): Promise<number> {
    for (const row of rows) {
      this.youtubeVideos.set(row.video_id, structuredClone(row));
    }
    return rows.length;
  }

  async upsertYoutubeDaily(rows: YoutubeDailyRecord[]): Promise<number> {
    for (const row of rows) {
      this.youtubeDaily.set(`${row.video_id}:${row.metric_date}`, structuredClone(row));
    }
    return rows.length;
  }

  async createSyncRun(run: SyncRunRecord): Promise<void> {
    this.syncRuns.set(run.run_id, structuredClone(run));
  }

  async finishSyncRun(runId: string, update: SyncRunUpdate): Promise<void> {
    const run = this.syncRuns.get(runId);
    if (!run) throw new Error(`Sync run not found: ${runId}`);
    this.syncRuns.set(runId, { ...run, ...structuredClone(update) });
  }

  async getLatestSyncRuns(): Promise<SyncRunRecord[]> {
    const latest = new Map<SyncRunRecord['source'], SyncRunRecord>();
    for (const run of this.syncRuns.values()) {
      const current = latest.get(run.source);
      if (!current || Date.parse(run.started_at) > Date.parse(current.started_at)) {
        latest.set(run.source, structuredClone(run));
      }
    }
    return [...latest.values()];
  }

  async getYoutubeMetricDates(startDate: string, endDate: string): Promise<string[]> {
    return [...new Set(
      [...this.youtubeDaily.values()]
        .map(row => row.metric_date)
        .filter(date => date >= startDate && date <= endDate),
    )].sort();
  }
}
