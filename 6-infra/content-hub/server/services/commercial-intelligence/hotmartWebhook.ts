import { randomUUID, timingSafeEqual } from 'crypto';
import {
  CommercialIntelligenceError,
  type CommercialIntelligenceRepository,
  type SyncRunRecord,
} from './contracts.js';
import { normalizeHotmartPayload } from './hotmartNormalizer.js';

export function isValidHotmartSecret(expected: string | undefined, received: string | undefined): boolean {
  if (!expected || !received) return false;
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

export interface ProcessHotmartWebhookInput {
  payload: unknown;
  receivedSecret?: string;
  configuredSecret?: string;
  buyerHmacSecret?: string;
  repository: CommercialIntelligenceRepository;
  now?: Date;
}

export interface ProcessHotmartWebhookResult {
  duplicate: boolean;
  updatedTransaction: boolean;
  warnings: string[];
}

export async function processHotmartWebhook(
  input: ProcessHotmartWebhookInput,
): Promise<ProcessHotmartWebhookResult> {
  if (!input.configuredSecret) {
    throw new CommercialIntelligenceError(
      'webhook_not_configured',
      'Webhook Hotmart ainda não configurado.',
      503,
    );
  }
  if (!isValidHotmartSecret(input.configuredSecret, input.receivedSecret)) {
    throw new CommercialIntelligenceError(
      'invalid_hottok',
      'Credencial do webhook Hotmart inválida.',
      401,
    );
  }

  const now = input.now || new Date();
  const normalized = normalizeHotmartPayload(input.payload, {
    source: 'webhook',
    buyerHmacSecret: input.buyerHmacSecret,
    now,
  });
  const runId = randomUUID();
  const run: SyncRunRecord = {
    run_id: runId,
    source: 'hotmart_webhook',
    job_type: normalized.event.event_type,
    status: 'running',
    requested_start: null,
    requested_end: null,
    source_watermark: normalized.event.occurred_at.slice(0, 10),
    rows_read: 1,
    rows_written: 0,
    rows_skipped: 0,
    repairs: 0,
    warnings: normalized.warnings,
    error_code: null,
    error_message: null,
    started_at: now.toISOString(),
    finished_at: null,
  };

  await input.repository.createSyncRun(run);
  try {
    const applied = await input.repository.applyHotmartEvent(
      normalized.event,
      normalized.transaction,
    );
    const duplicate = !applied.insertedEvent;
    await input.repository.finishSyncRun(runId, {
      status: 'success',
      rows_written: applied.insertedEvent ? 1 : 0,
      rows_skipped: duplicate ? 1 : 0,
      finished_at: now.toISOString(),
    });
    return {
      duplicate,
      updatedTransaction: applied.updatedTransaction,
      warnings: normalized.warnings,
    };
  } catch (error) {
    await input.repository.finishSyncRun(runId, {
      status: 'failed',
      error_code: error instanceof CommercialIntelligenceError ? error.code : 'webhook_persistence_failed',
      error_message: 'Falha ao persistir evento Hotmart.',
      finished_at: now.toISOString(),
    }).catch(() => undefined);
    throw error;
  }
}
