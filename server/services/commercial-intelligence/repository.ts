import type {
  ApplyHotmartEventResult,
  CommercialIntelligenceRepository,
  HotmartEventRecord,
  HotmartTransactionRecord,
  NormalizedHotmartStatus,
  SyncRunRecord,
  SyncRunUpdate,
  YoutubeDailyRecord,
  YoutubeVideoRecord,
  YoutubeVideoStatsRecord,
} from './contracts.js';

const TERMINAL_HOTMART_STATUSES = new Set<NormalizedHotmartStatus>(['refunded', 'chargeback']);
const EMPTY_CAMPAIGN_TRACKING_CODES = new Set<string>();

function latestIso(left: string | null, right: string | null): string | null {
  if (!left) return right;
  if (!right) return left;
  return Date.parse(right) > Date.parse(left) ? right : left;
}

function mergeHotmartStatus(
  current: NormalizedHotmartStatus,
  incoming: NormalizedHotmartStatus,
  incomingIsNewer: boolean,
  incomingIsReconciliation: boolean,
): NormalizedHotmartStatus {
  if (incoming === 'unknown' && current !== 'unknown') return current;
  const currentIsTerminal = TERMINAL_HOTMART_STATUSES.has(current);
  if (TERMINAL_HOTMART_STATUSES.has(incoming)) {
    if (incomingIsReconciliation || incomingIsNewer || !currentIsTerminal) return incoming;
    return current;
  }
  if (currentIsTerminal) return current;
  if (incomingIsReconciliation || incomingIsNewer || current === 'unknown') return incoming;
  return current;
}

function mergeTrackingCode(
  current: string | null,
  incoming: string | null,
  campaignTrackingCodes: ReadonlySet<string>,
): string | null {
  const matchesCampaign = (value: string | null): boolean => {
    if (!value) return false;
    const normalized = value.toLowerCase();
    return [...campaignTrackingCodes].some(code => code.toLowerCase() === normalized);
  };
  const currentIsCampaign = matchesCampaign(current);
  const incomingIsCampaign = matchesCampaign(incoming);
  if (currentIsCampaign) return current;
  if (incomingIsCampaign) return incoming;
  return current ?? incoming;
}

function hasSubstantiveChange(
  current: HotmartTransactionRecord,
  merged: HotmartTransactionRecord,
): boolean {
  return (Object.keys(merged) as Array<keyof HotmartTransactionRecord>).some(key => (
    key !== 'last_reconciled_at' && merged[key] !== current[key]
  ));
}

export function mergeHotmartTransaction(
  current: HotmartTransactionRecord,
  incoming: HotmartTransactionRecord,
  campaignTrackingCodes: ReadonlySet<string> = EMPTY_CAMPAIGN_TRACKING_CODES,
): HotmartTransactionRecord {
  const incomingIsNewer = Date.parse(incoming.last_event_at) >= Date.parse(current.last_event_at);
  const incomingIsReconciliation = Boolean(incoming.last_reconciled_at);
  const financial = <T>(currentValue: T | null, incomingValue: T | null): T | null => (
    incomingIsReconciliation ? incomingValue ?? currentValue : currentValue ?? incomingValue
  );
  return {
    transaction_id: current.transaction_id,
    buyer_key: incoming.buyer_key ?? current.buyer_key,
    product_id: incoming.product_id ?? current.product_id,
    product_name: incoming.product_name === 'Desconhecido' ? current.product_name : incoming.product_name,
    status: mergeHotmartStatus(
      current.status,
      incoming.status,
      incomingIsNewer,
      incomingIsReconciliation,
    ),
    order_date: incoming.order_date ?? current.order_date,
    approved_date: incoming.approved_date ?? current.approved_date,
    gross_value: financial(current.gross_value, incoming.gross_value),
    gross_currency: financial(current.gross_currency, incoming.gross_currency),
    fee_value: financial(current.fee_value, incoming.fee_value),
    fee_currency: financial(current.fee_currency, incoming.fee_currency),
    producer_net_value: financial(current.producer_net_value, incoming.producer_net_value),
    producer_net_currency: financial(current.producer_net_currency, incoming.producer_net_currency),
    payment_type: incoming.payment_type ?? current.payment_type,
    offer_code: incoming.offer_code ?? current.offer_code,
    subscription_id: incoming.subscription_id ?? current.subscription_id,
    is_renewal: incoming.is_renewal || current.is_renewal,
    tracking_src: mergeTrackingCode(current.tracking_src, incoming.tracking_src, campaignTrackingCodes),
    tracking_sck: mergeTrackingCode(current.tracking_sck, incoming.tracking_sck, campaignTrackingCodes),
    tracking_xcod: mergeTrackingCode(current.tracking_xcod, incoming.tracking_xcod, campaignTrackingCodes),
    last_event_at: latestIso(current.last_event_at, incoming.last_event_at)!,
    last_reconciled_at: latestIso(current.last_reconciled_at, incoming.last_reconciled_at),
  };
}

export class InMemoryCommercialIntelligenceRepository implements CommercialIntelligenceRepository {
  readonly configured = true;
  readonly hotmartEvents = new Map<string, HotmartEventRecord>();
  readonly hotmartTransactions = new Map<string, HotmartTransactionRecord>();
  readonly youtubeVideos = new Map<string, YoutubeVideoRecord>();
  readonly youtubeDaily = new Map<string, YoutubeDailyRecord>();
  readonly syncRuns = new Map<string, SyncRunRecord>();
  private readonly campaignTrackingCodes: ReadonlySet<string>;

  constructor(campaignTrackingCodes: Iterable<string> = []) {
    this.campaignTrackingCodes = new Set(
      [...campaignTrackingCodes].map(code => code.trim().toLowerCase()),
    );
  }

  async applyHotmartEvent(
    event: HotmartEventRecord,
    transaction: HotmartTransactionRecord,
  ): Promise<ApplyHotmartEventResult> {
    const insertedEvent = !this.hotmartEvents.has(event.event_key);
    if (!insertedEvent && event.source !== 'reconciliation') {
      return { insertedEvent: false, updatedTransaction: false, repairedTransaction: false };
    }

    if (insertedEvent) this.hotmartEvents.set(event.event_key, structuredClone(event));
    const current = this.hotmartTransactions.get(transaction.transaction_id);
    const merged = current
      ? mergeHotmartTransaction(current, transaction, this.campaignTrackingCodes)
      : transaction;
    const shouldUpdate = !current || JSON.stringify(merged) !== JSON.stringify(current);

    if (shouldUpdate) {
      this.hotmartTransactions.set(transaction.transaction_id, structuredClone(merged));
    }

    return {
      insertedEvent,
      updatedTransaction: shouldUpdate,
      repairedTransaction: Boolean(current && shouldUpdate && hasSubstantiveChange(current, merged)),
    };
  }

  async upsertYoutubeVideos(rows: YoutubeVideoRecord[]): Promise<number> {
    for (const row of rows) {
      this.youtubeVideos.set(row.video_id, structuredClone(row));
    }
    return rows.length;
  }

  async listYoutubeVideoIds(): Promise<string[]> {
    return [...this.youtubeVideos.keys()];
  }

  async upsertYoutubeVideoStats(rows: YoutubeVideoStatsRecord[]): Promise<number> {
    for (const row of rows) {
      const current = this.youtubeVideos.get(row.video_id);
      if (!current) continue;
      this.youtubeVideos.set(row.video_id, { ...current, ...structuredClone(row) });
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
