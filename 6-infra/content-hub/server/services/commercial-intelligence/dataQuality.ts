import type {
  CommercialIntelligenceRepository,
  SyncRunRecord,
  SyncSource,
} from './contracts.js';
import { defaultDateRange, enumerateDates } from './dateRange.js';

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

const SOURCE_LABELS: Record<SyncSource, string> = {
  youtube: 'YouTube Analytics',
  hotmart_webhook: 'Webhook Hotmart',
  hotmart_reconciliation: 'Reconciliação Hotmart',
};

function hoursSince(value: string | null, now: Date): number | null {
  if (!value) return null;
  const elapsed = now.getTime() - Date.parse(value);
  return Number.isFinite(elapsed) ? Math.max(0, elapsed / 3_600_000) : null;
}

function sourceStatus(
  source: SyncSource,
  run: SyncRunRecord | undefined,
  now: Date,
  webhookConfigured: boolean,
): DataQualitySource {
  if (source === 'hotmart_webhook' && !webhookConfigured) {
    return {
      source,
      label: SOURCE_LABELS[source],
      status: 'not_configured',
      lastSyncAt: null,
      sourceWatermark: null,
      ageHours: null,
      rowsRead: 0,
      rowsWritten: 0,
      rowsSkipped: 0,
      repairs: 0,
      warnings: ['webhook_not_configured'],
      errorCode: null,
      errorMessage: null,
    };
  }
  if (!run) {
    return {
      source,
      label: SOURCE_LABELS[source],
      status: 'warning',
      lastSyncAt: null,
      sourceWatermark: null,
      ageHours: null,
      rowsRead: 0,
      rowsWritten: 0,
      rowsSkipped: 0,
      repairs: 0,
      warnings: ['source_never_synced'],
      errorCode: null,
      errorMessage: null,
    };
  }

  const ageHours = hoursSince(run.finished_at || run.started_at, now);
  const stale = ageHours !== null && ageHours > 36;
  const warnings = [...run.warnings];
  if (stale && !warnings.includes('source_stale')) warnings.push('source_stale');
  const status: DataQualityStatus = run.status === 'failed'
    ? 'error'
    : run.status === 'partial' || stale || warnings.length
      ? 'warning'
      : 'healthy';

  return {
    source,
    label: SOURCE_LABELS[source],
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

function overall(sources: DataQualitySource[], databaseConfigured: boolean): DataQualityStatus {
  if (!databaseConfigured) return 'not_configured';
  if (sources.some(source => source.status === 'error')) return 'error';
  if (sources.some(source => source.status !== 'healthy')) return 'warning';
  return 'healthy';
}

export async function getDataQualityReport(input: {
  repository: CommercialIntelligenceRepository;
  hotmartWebhookConfigured: boolean;
  buyerHmacConfigured: boolean;
  now?: Date;
}): Promise<DataQualityReport> {
  const now = input.now || new Date();
  const range = defaultDateRange(35, now);
  const configuration = {
    database: input.repository.configured,
    hotmartWebhook: input.hotmartWebhookConfigured,
    buyerHmac: input.buyerHmacConfigured,
  };

  if (!input.repository.configured) {
    const sources = (Object.keys(SOURCE_LABELS) as SyncSource[]).map(source => ({
      source,
      label: SOURCE_LABELS[source],
      status: 'not_configured' as const,
      lastSyncAt: null,
      sourceWatermark: null,
      ageHours: null,
      rowsRead: 0,
      rowsWritten: 0,
      rowsSkipped: 0,
      repairs: 0,
      warnings: ['database_not_configured'],
      errorCode: null,
      errorMessage: null,
    }));
    return {
      generatedAt: now.toISOString(),
      overallStatus: 'not_configured',
      coverage: {
        requestedStart: range.startDate,
        requestedEnd: range.endDate,
        youtubeDatesPresent: 0,
        youtubeMissingDates: [],
      },
      configuration,
      sources,
      alerts: [
        'database_not_configured',
        ...(configuration.hotmartWebhook ? [] : ['webhook_not_configured']),
        ...(configuration.buyerHmac ? [] : ['buyer_hmac_secret_missing']),
      ],
    };
  }

  try {
    const [runs, youtubeDates] = await Promise.all([
      input.repository.getLatestSyncRuns(),
      input.repository.getYoutubeMetricDates(range.startDate, range.endDate),
    ]);
    const bySource = new Map(runs.map(run => [run.source, run]));
    const sources = (Object.keys(SOURCE_LABELS) as SyncSource[]).map(source =>
      sourceStatus(source, bySource.get(source), now, configuration.hotmartWebhook));
    const youtubeMissingDates = enumerateDates(range.startDate, range.endDate)
      .filter(date => !youtubeDates.includes(date));
    if (youtubeMissingDates.length) {
      const youtubeSource = sources.find(source => source.source === 'youtube');
      if (youtubeSource && !youtubeSource.warnings.some(warning => warning.startsWith('youtube_missing_days'))) {
        youtubeSource.warnings.push(`youtube_missing_days:${youtubeMissingDates.length}`);
        if (youtubeSource.status === 'healthy') youtubeSource.status = 'warning';
      }
    }

    const alerts = new Set<string>();
    for (const source of sources) {
      source.warnings.forEach(warning => alerts.add(warning));
      if (source.repairs > 0) alerts.add('hotmart_reconciliation_repairs');
    }
    if (!configuration.buyerHmac) alerts.add('buyer_hmac_secret_missing');

    return {
      generatedAt: now.toISOString(),
      overallStatus: overall(sources, true),
      coverage: {
        requestedStart: range.startDate,
        requestedEnd: range.endDate,
        youtubeDatesPresent: youtubeDates.length,
        youtubeMissingDates,
      },
      configuration,
      sources,
      alerts: [...alerts],
    };
  } catch {
    const sources = (Object.keys(SOURCE_LABELS) as SyncSource[]).map(source => ({
      source,
      label: SOURCE_LABELS[source],
      status: 'error' as const,
      lastSyncAt: null,
      sourceWatermark: null,
      ageHours: null,
      rowsRead: 0,
      rowsWritten: 0,
      rowsSkipped: 0,
      repairs: 0,
      warnings: ['database_query_failed'],
      errorCode: 'database_query_failed',
      errorMessage: 'Não foi possível consultar a qualidade dos dados.',
    }));
    return {
      generatedAt: now.toISOString(),
      overallStatus: 'error',
      coverage: {
        requestedStart: range.startDate,
        requestedEnd: range.endDate,
        youtubeDatesPresent: 0,
        youtubeMissingDates: [],
      },
      configuration,
      sources,
      alerts: ['database_query_failed'],
    };
  }
}
