export type MemberRole = 'viewer' | 'admin';
export type SyncSource = 'youtube' | 'hotmart_webhook' | 'hotmart_reconciliation';
export type SyncStatus = 'running' | 'success' | 'partial' | 'failed';
export type NormalizedHotmartStatus = 'approved' | 'refunded' | 'chargeback' | 'canceled' | 'expired' | 'blocked' | 'disputed' | 'unknown';

export interface Member {
  userId: string;
  role: MemberRole;
}

export interface HotmartTransactionRecord {
  transaction_id: string;
  buyer_key: string | null;
  product_id: string | null;
  product_name: string;
  status: NormalizedHotmartStatus;
  order_date: string | null;
  approved_date: string | null;
  gross_value: number | null;
  gross_currency: string | null;
  fee_value: number | null;
  fee_currency: string | null;
  producer_net_value: number | null;
  producer_net_currency: string | null;
  payment_type: string | null;
  offer_code: string | null;
  subscription_id: string | null;
  is_renewal: boolean;
  tracking_src: string | null;
  tracking_sck: string | null;
  tracking_xcod: string | null;
  last_event_at: string;
  last_reconciled_at: string | null;
}

export interface HotmartEventRecord {
  event_key: string;
  transaction_id: string;
  event_type: string;
  raw_status: string;
  normalized_status: NormalizedHotmartStatus;
  occurred_at: string;
  source: 'webhook' | 'reconciliation';
  sanitized_payload: Record<string, unknown>;
}

export interface YoutubeVideoRecord {
  video_id: string;
  title: string;
  published_at: string | null;
  duration_seconds: number | null;
  content_type: 'long' | 'short' | 'live' | 'unknown';
  thumbnail_url: string | null;
  metadata_refreshed_at: string;
}

export interface YoutubeDailyRecord {
  video_id: string;
  metric_date: string;
  views: number;
  estimated_minutes_watched: number;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  subscribers_gained: number | null;
  subscribers_lost: number | null;
  source_updated_at: string;
}

export interface SyncRunRecord {
  run_id: string;
  source: SyncSource;
  job_type: string;
  status: SyncStatus;
  requested_start: string | null;
  requested_end: string | null;
  source_watermark: string | null;
  rows_read: number;
  rows_written: number;
  rows_skipped: number;
  repairs: number;
  warnings: string[];
  error_code: string | null;
  error_message: string | null;
  started_at: string;
  finished_at: string | null;
}

export type SyncRunUpdate = Partial<Omit<SyncRunRecord, 'run_id' | 'source' | 'job_type' | 'started_at'>>;

export interface ApplyHotmartEventResult {
  insertedEvent: boolean;
  updatedTransaction: boolean;
  repairedTransaction: boolean;
}

export interface EdgeRepository {
  applyHotmartEvent(event: HotmartEventRecord, transaction: HotmartTransactionRecord): Promise<ApplyHotmartEventResult>;
  upsertYoutubeVideos(rows: YoutubeVideoRecord[]): Promise<number>;
  upsertYoutubeDaily(rows: YoutubeDailyRecord[]): Promise<number>;
  createSyncRun(run: SyncRunRecord): Promise<void>;
  finishSyncRun(runId: string, update: SyncRunUpdate): Promise<void>;
  getLatestSyncRuns(): Promise<SyncRunRecord[]>;
  getYoutubeMetricDates(startDate: string, endDate: string): Promise<string[]>;
  acquireLock(source: 'youtube' | 'hotmart_reconciliation', ownerId: string): Promise<boolean>;
  releaseLock(source: 'youtube' | 'hotmart_reconciliation', ownerId: string): Promise<void>;
}

export type DataQualityStatus = 'healthy' | 'warning' | 'error' | 'not_configured';

export interface DataQualitySource {
  source: SyncSource;
  label: string;
  status: DataQualityStatus;
  lastSyncAt: string | null;
  sourceWatermark: string | null;
  ageHours: number | null;
  rowsRead: number;
  rowsWritten: number;
  rowsSkipped: number;
  repairs: number;
  warnings: string[];
  errorCode: string | null;
  errorMessage: string | null;
}

export interface DataQualityReport {
  generatedAt: string;
  overallStatus: DataQualityStatus;
  coverage: {
    requestedStart: string;
    requestedEnd: string;
    youtubeDatesPresent: number;
    youtubeMissingDates: string[];
  };
  configuration: {
    database: boolean;
    hotmartWebhook: boolean;
    buyerHmac: boolean;
  };
  sources: DataQualitySource[];
  alerts: string[];
}
