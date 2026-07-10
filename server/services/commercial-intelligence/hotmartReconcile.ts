import { randomUUID } from 'crypto';
import { getSalesHistoryRaw } from '../hotmart.js';
import {
  CommercialIntelligenceError,
  type CommercialIntelligenceRepository,
  type SyncRunRecord,
} from './contracts.js';
import { defaultDateRange, validateDateRange } from './dateRange.js';
import { normalizeHotmartPayload } from './hotmartNormalizer.js';

export const RECONCILIATION_STATUSES = [
  'APPROVED',
  'COMPLETE',
  'REFUNDED',
  'CHARGEBACK',
  'CANCELLED',
] as const;

export type HotmartHistoryReader = (
  startDate: string,
  endDate: string,
  status: string,
) => Promise<unknown[]>;

export interface ReconcileHotmartInput {
  repository: CommercialIntelligenceRepository;
  startDate?: string;
  endDate?: string;
  buyerHmacSecret?: string;
  readHistory?: HotmartHistoryReader;
  now?: Date;
}

export interface ReconcileHotmartResult {
  runId: string;
  status: 'success' | 'partial';
  rowsRead: number;
  rowsWritten: number;
  rowsSkipped: number;
  repairs: number;
  warnings: string[];
}

export async function reconcileHotmart(input: ReconcileHotmartInput): Promise<ReconcileHotmartResult> {
  const now = input.now || new Date();
  const defaults = defaultDateRange(35, now);
  const range = validateDateRange(
    input.startDate || defaults.startDate,
    input.endDate || defaults.endDate,
  );
  const readHistory = input.readHistory || getSalesHistoryRaw;
  const runId = randomUUID();
  const run: SyncRunRecord = {
    run_id: runId,
    source: 'hotmart_reconciliation',
    job_type: 'sales_history',
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

  let rowsRead = 0;
  let rowsWritten = 0;
  let rowsSkipped = 0;
  let repairs = 0;
  const warningSet = new Set<string>();
  const failedStatuses: string[] = [];

  try {
    for (const status of RECONCILIATION_STATUSES) {
      let rows: unknown[];
      try {
        rows = await readHistory(range.startDate, range.endDate, status);
      } catch {
        failedStatuses.push(status);
        continue;
      }

      rowsRead += rows.length;
      for (const row of rows) {
        try {
          const normalized = normalizeHotmartPayload(row, {
            source: 'reconciliation',
            buyerHmacSecret: input.buyerHmacSecret,
            now,
            eventType: `RECONCILIATION_${status}`,
          });
          normalized.warnings.forEach(warning => warningSet.add(warning));
          const applied = await input.repository.applyHotmartEvent(
            normalized.event,
            normalized.transaction,
          );
          if (applied.insertedEvent) rowsWritten += 1;
          else rowsSkipped += 1;
          if (applied.repairedTransaction) repairs += 1;
        } catch (error) {
          if (error instanceof CommercialIntelligenceError && error.statusCode === 400) {
            rowsSkipped += 1;
            warningSet.add('invalid_hotmart_row');
            continue;
          }
          throw error;
        }
      }
    }

    if (failedStatuses.length) {
      warningSet.add(`hotmart_partial_statuses:${failedStatuses.join(',')}`);
    }
    const resultStatus = failedStatuses.length ? 'partial' : 'success';
    const warnings = [...warningSet];
    await input.repository.finishSyncRun(runId, {
      status: resultStatus,
      source_watermark: range.endDate,
      rows_read: rowsRead,
      rows_written: rowsWritten,
      rows_skipped: rowsSkipped,
      repairs,
      warnings,
      finished_at: now.toISOString(),
    });
    return {
      runId,
      status: resultStatus,
      rowsRead,
      rowsWritten,
      rowsSkipped,
      repairs,
      warnings,
    };
  } catch (error) {
    await input.repository.finishSyncRun(runId, {
      status: 'failed',
      rows_read: rowsRead,
      rows_written: rowsWritten,
      rows_skipped: rowsSkipped,
      repairs,
      warnings: [...warningSet],
      error_code: error instanceof CommercialIntelligenceError ? error.code : 'hotmart_reconciliation_failed',
      error_message: 'Falha durante a reconciliação Hotmart.',
      finished_at: now.toISOString(),
    }).catch(() => undefined);
    throw error;
  }
}
