export type DataQualityStatus = 'healthy' | 'warning' | 'error' | 'not_configured';

export interface DataQualitySource {
  source: 'youtube' | 'hotmart_webhook' | 'hotmart_reconciliation';
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
