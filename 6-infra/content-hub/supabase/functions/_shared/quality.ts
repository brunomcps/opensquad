import { defaultDateRange, enumerateDates } from './dates.ts';
import type {
  DataQualityReport,
  DataQualitySource,
  DataQualityStatus,
  EdgeRepository,
  SyncRunRecord,
  SyncSource,
} from './types.ts';

const LABELS: Record<SyncSource, string> = {
  youtube: 'YouTube Analytics',
  hotmart_webhook: 'Webhook Hotmart',
  hotmart_reconciliation: 'Reconciliação Hotmart',
};

function hoursSince(value: string | null, now: Date): number | null {
  if (!value) return null;
  const elapsed = now.getTime() - Date.parse(value);
  return Number.isFinite(elapsed) ? Math.max(0, elapsed / 3_600_000) : null;
}

function sourceQuality(
  source: SyncSource,
  run: SyncRunRecord | undefined,
  now: Date,
  webhookConfigured: boolean,
): DataQualitySource {
  if (source === 'hotmart_webhook' && !webhookConfigured) {
    return {
      source, label: LABELS[source], status: 'not_configured', lastSyncAt: null,
      sourceWatermark: null, ageHours: null, rowsRead: 0, rowsWritten: 0,
      rowsSkipped: 0, repairs: 0, warnings: ['webhook_not_configured'],
      errorCode: null, errorMessage: null,
    };
  }
  if (!run) {
    return {
      source, label: LABELS[source], status: 'warning', lastSyncAt: null,
      sourceWatermark: null, ageHours: null, rowsRead: 0, rowsWritten: 0,
      rowsSkipped: 0, repairs: 0, warnings: ['source_never_synced'],
      errorCode: null, errorMessage: null,
    };
  }
  const ageHours = hoursSince(run.finished_at || run.started_at, now);
  const stale = ageHours !== null && ageHours > 36;
  const warnings = [...run.warnings];
  if (stale && !warnings.includes('source_stale')) warnings.push('source_stale');
  const status: DataQualityStatus = run.status === 'failed'
    ? 'error'
    : run.status === 'partial' || stale || warnings.length ? 'warning' : 'healthy';
  return {
    source,
    label: LABELS[source],
    status,
    lastSyncAt: run.finished_at || run.started_at,
    sourceWatermark: run.source_watermark,
    ageHours,
    rowsRead: run.rows_read,
    rowsWritten: run.rows_written,
    rowsSkipped: run.rows_skipped,
    repairs: run.repairs,
    warnings,
    errorCode: run.error_code,
    errorMessage: run.error_message,
  };
}

export async function getDataQualityReport(input: {
  repository: EdgeRepository;
  hotmartWebhookConfigured: boolean;
  buyerHmacConfigured: boolean;
  now?: Date;
}): Promise<DataQualityReport> {
  const now = input.now || new Date();
  const range = defaultDateRange(35, now);
  const [runs, youtubeDates] = await Promise.all([
    input.repository.getLatestSyncRuns(),
    input.repository.getYoutubeMetricDates(range.startDate, range.endDate),
  ]);
  const bySource = new Map(runs.map(run => [run.source, run]));
  const sources = (Object.keys(LABELS) as SyncSource[]).map(source =>
    sourceQuality(source, bySource.get(source), now, input.hotmartWebhookConfigured));
  const youtubeMissingDates = enumerateDates(range.startDate, range.endDate)
    .filter(date => !youtubeDates.includes(date));
  if (youtubeMissingDates.length) {
    const youtube = sources.find(source => source.source === 'youtube');
    if (youtube && !youtube.warnings.some(warning => warning.startsWith('youtube_missing_days'))) {
      youtube.warnings.push(`youtube_missing_days:${youtubeMissingDates.length}`);
      if (youtube.status === 'healthy') youtube.status = 'warning';
    }
  }

  const alerts = new Set<string>();
  for (const source of sources) {
    source.warnings.forEach(warning => alerts.add(warning));
    if (source.repairs > 0) alerts.add('hotmart_reconciliation_repairs');
  }
  if (!input.buyerHmacConfigured) alerts.add('buyer_hmac_secret_missing');
  const overallStatus: DataQualityStatus = sources.some(source => source.status === 'error')
    ? 'error'
    : sources.some(source => source.status !== 'healthy') ? 'warning' : 'healthy';

  return {
    generatedAt: now.toISOString(),
    overallStatus,
    coverage: {
      requestedStart: range.startDate,
      requestedEnd: range.endDate,
      youtubeDatesPresent: youtubeDates.length,
      youtubeMissingDates,
    },
    configuration: {
      database: true,
      hotmartWebhook: input.hotmartWebhookConfigured,
      buyerHmac: input.buyerHmacConfigured,
    },
    sources,
    alerts: [...alerts],
  };
}
