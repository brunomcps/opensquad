import { hmacSha256, sha256, secureEqual } from './crypto.ts';
import { defaultDateRange, validateDateRange } from './dates.ts';
import { CommercialIntelligenceError } from './errors.ts';
import type {
  EdgeRepository,
  HotmartEventRecord,
  HotmartTransactionRecord,
  NormalizedHotmartStatus,
  SyncRunRecord,
} from './types.ts';

declare const Deno: { env: { get(name: string): string | undefined } };

type JsonRecord = Record<string, any>;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {};
}

function asString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

function asNumber(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function toIsoDate(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  let candidate: string | number = value as string | number;
  if (typeof candidate === 'string' && /^\d+$/.test(candidate)) candidate = Number(candidate);
  if (typeof candidate === 'number' && candidate < 100_000_000_000) candidate *= 1000;
  const date = new Date(candidate);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function normalizeHotmartStatus(status: unknown): NormalizedHotmartStatus {
  const raw = String(status || '').trim().toUpperCase();
  if (['APPROVED', 'COMPLETE', 'COMPLETED'].includes(raw)) return 'approved';
  if (['REFUNDED', 'PARTIALLY_REFUNDED'].includes(raw)) return 'refunded';
  if (raw === 'CHARGEBACK') return 'chargeback';
  if (['CANCELLED', 'CANCELED'].includes(raw)) return 'canceled';
  if (raw === 'EXPIRED') return 'expired';
  if (raw === 'BLOCKED') return 'blocked';
  if (['DISPUTE', 'DISPUTED'].includes(raw)) return 'disputed';
  return 'unknown';
}

function producerCommission(data: JsonRecord) {
  const candidates = [
    ...(Array.isArray(data.commissions) ? data.commissions : []),
    ...(Array.isArray(data.purchase?.commissions) ? data.purchase.commissions : []),
  ].map(asRecord);
  const producer = candidates.find(item => String(item.source || '').toUpperCase() === 'PRODUCER');
  const commission = asRecord(producer?.commission);
  const direct = asRecord(data.commission);
  return {
    value: asNumber(producer?.value ?? commission.value ?? direct.value),
    currency: asString(producer?.currency_value ?? producer?.currency_code ?? commission.currency_value ?? commission.currency_code ?? direct.currency_value ?? direct.currency_code),
  };
}

function trackingOrigin(purchase: JsonRecord) {
  const origin = asRecord(purchase.origin);
  const tracking = asRecord(purchase.tracking);
  return {
    src: asString(origin.src ?? tracking.src ?? tracking.source ?? purchase.src ?? purchase.source),
    sck: asString(origin.sck ?? tracking.sck ?? purchase.sck),
    xcod: asString(origin.xcod ?? tracking.xcod ?? purchase.xcod),
  };
}

export async function normalizeHotmartPayload(
  payload: unknown,
  options: {
    source: HotmartEventRecord['source'];
    buyerHmacSecret?: string;
    now?: Date;
    eventType?: string;
  },
): Promise<{ event: HotmartEventRecord; transaction: HotmartTransactionRecord; warnings: string[] }> {
  const root = asRecord(payload);
  const data = asRecord(root.data && typeof root.data === 'object' ? root.data : root);
  const purchase = asRecord(data.purchase);
  const product = asRecord(data.product);
  const payment = asRecord(purchase.payment);
  const fee = asRecord(purchase.hotmart_fee);
  const price = asRecord(purchase.price);
  const origin = trackingOrigin(purchase);
  const offer = asRecord(purchase.offer ?? data.offer);
  const subscription = asRecord(data.subscription ?? purchase.subscription);
  const transactionId = asString(purchase.transaction ?? purchase.transaction_id);
  const rawStatus = asString(purchase.status) || 'UNKNOWN';
  const eventType = asString(options.eventType ?? root.event) || `RECONCILIATION_${rawStatus}`;
  const now = options.now || new Date();
  const orderDate = toIsoDate(purchase.order_date);
  const approvedDate = toIsoDate(purchase.approved_date);
  const occurredAt = toIsoDate(root.creation_date ?? root.event_date) || approvedDate || orderDate || now.toISOString();
  if (!transactionId) {
    throw new CommercialIntelligenceError('invalid_hotmart_payload', 'Payload Hotmart sem identificador de transação.', 400);
  }

  const buyer = asRecord(data.buyer);
  const identity = asString(buyer.ucode) || asString(buyer.email);
  const warnings: string[] = [];
  let buyerKey: string | null = null;
  if (!options.buyerHmacSecret) warnings.push('buyer_hmac_secret_missing');
  else if (identity) buyerKey = await hmacSha256(options.buyerHmacSecret, identity);

  const normalizedStatus = normalizeHotmartStatus(rawStatus);
  const commission = producerCommission(data);
  const eventId = asString(root.id);
  const eventKey = eventId
    ? `hotmart:${eventId}`
    : `hotmart:${await sha256(JSON.stringify([eventType, transactionId, rawStatus, occurredAt]))}`;
  const productId = asString(product.id);
  const productName = asString(product.name) || 'Desconhecido';
  const subscriptionId = asString(subscription.subscriber_code ?? subscription.id);
  const isRenewal = /RECURR|RENEW/i.test(eventType)
    || Boolean(subscriptionId && purchase.recurrence_number && Number(purchase.recurrence_number) > 1);

  const sanitizedPayload: Record<string, unknown> = {
    eventType,
    transactionId,
    rawStatus,
    normalizedStatus,
    product: { id: productId, name: productName },
    purchase: {
      orderDate,
      approvedDate,
      grossValue: asNumber(price.value),
      grossCurrency: asString(price.currency_code ?? price.currency_value),
      feeValue: asNumber(fee.total),
      feeCurrency: asString(fee.currency_code ?? fee.currency_value),
      producerNetValue: commission.value,
      producerNetCurrency: commission.currency,
      paymentType: asString(payment.type),
      offerCode: asString(offer.code),
    },
    origin: {
      src: origin.src,
      sck: origin.sck,
      xcod: origin.xcod,
    },
    subscription: { id: subscriptionId, isRenewal },
  };

  return {
    warnings,
    event: {
      event_key: eventKey,
      transaction_id: transactionId,
      event_type: eventType,
      raw_status: rawStatus,
      normalized_status: normalizedStatus,
      occurred_at: occurredAt,
      source: options.source,
      sanitized_payload: sanitizedPayload,
    },
    transaction: {
      transaction_id: transactionId,
      buyer_key: buyerKey,
      product_id: productId,
      product_name: productName,
      status: normalizedStatus,
      order_date: orderDate,
      approved_date: approvedDate,
      gross_value: asNumber(price.value),
      gross_currency: asString(price.currency_code ?? price.currency_value),
      fee_value: asNumber(fee.total),
      fee_currency: asString(fee.currency_code ?? fee.currency_value),
      producer_net_value: commission.value,
      producer_net_currency: commission.currency,
      payment_type: asString(payment.type),
      offer_code: asString(offer.code),
      subscription_id: subscriptionId,
      is_renewal: isRenewal,
      tracking_src: origin.src,
      tracking_sck: origin.sck,
      tracking_xcod: origin.xcod,
      last_event_at: occurredAt,
      last_reconciled_at: options.source === 'reconciliation' ? now.toISOString() : null,
    },
  };
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.value;
  const clientId = Deno.env.get('HOTMART_CLIENT_ID');
  const clientSecret = Deno.env.get('HOTMART_CLIENT_SECRET');
  if (!clientId || !clientSecret) {
    throw new CommercialIntelligenceError('source_not_configured', 'Credenciais Hotmart não configuradas.', 503);
  }
  const response = await fetch('https://api-sec-vlc.hotmart.com/security/oauth/token?grant_type=client_credentials', {
    method: 'POST',
    headers: {
      authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
  });
  if (!response.ok) throw new CommercialIntelligenceError('hotmart_auth_failed', 'Falha ao autenticar na Hotmart.', 502);
  const data = await response.json() as { access_token: string; expires_in: number };
  cachedToken = { value: data.access_token, expiresAt: Date.now() + Math.max(60, data.expires_in - 60) * 1000 };
  return cachedToken.value;
}

function hotmartMillis(value: string, endOfDay = false): string {
  const timestamp = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}-03:00`).getTime();
  if (!Number.isFinite(timestamp)) throw new CommercialIntelligenceError('invalid_date_range', 'Intervalo Hotmart inválido.', 400);
  return String(timestamp);
}

export async function readHotmartHistory(startDate: string, endDate: string, status: string): Promise<unknown[]> {
  const baseUrl = Deno.env.get('HOTMART_ENVIRONMENT') === 'sandbox'
    ? 'https://sandbox.hotmart.com/payments/api/v1'
    : 'https://developers.hotmart.com/payments/api/v1';
  const items: unknown[] = [];
  let pageToken: string | undefined;
  do {
    const url = new URL(`${baseUrl}/sales/history`);
    url.searchParams.set('start_date', hotmartMillis(startDate));
    url.searchParams.set('end_date', hotmartMillis(endDate, true));
    url.searchParams.set('transaction_status', status);
    url.searchParams.set('max_results', '500');
    if (pageToken) url.searchParams.set('page_token', pageToken);
    const response = await fetch(url, { headers: { authorization: `Bearer ${await accessToken()}` } });
    if (!response.ok) throw new CommercialIntelligenceError('hotmart_api_failed', 'Falha ao consultar histórico Hotmart.', 502);
    const data = await response.json() as { items?: unknown[]; page_info?: { next_page_token?: string } };
    items.push(...(data.items || []));
    pageToken = data.page_info?.next_page_token;
  } while (pageToken);
  return items;
}

export async function processHotmartWebhook(input: {
  payload: unknown;
  receivedSecret?: string;
  configuredSecret?: string;
  buyerHmacSecret?: string;
  repository: EdgeRepository;
  now?: Date;
}) {
  if (!input.configuredSecret) throw new CommercialIntelligenceError('webhook_not_configured', 'Webhook Hotmart não configurado.', 503);
  if (!secureEqual(input.configuredSecret, input.receivedSecret)) {
    throw new CommercialIntelligenceError('invalid_hottok', 'Credencial do webhook Hotmart inválida.', 401);
  }
  const now = input.now || new Date();
  const normalized = await normalizeHotmartPayload(input.payload, {
    source: 'webhook', buyerHmacSecret: input.buyerHmacSecret, now,
  });
  const runId = crypto.randomUUID();
  await input.repository.createSyncRun({
    run_id: runId, source: 'hotmart_webhook', job_type: normalized.event.event_type,
    status: 'running', requested_start: null, requested_end: null,
    source_watermark: normalized.event.occurred_at.slice(0, 10), rows_read: 1,
    rows_written: 0, rows_skipped: 0, repairs: 0, warnings: normalized.warnings,
    error_code: null, error_message: null, started_at: now.toISOString(), finished_at: null,
  });
  try {
    const applied = await input.repository.applyHotmartEvent(normalized.event, normalized.transaction);
    const duplicate = !applied.insertedEvent;
    await input.repository.finishSyncRun(runId, {
      status: 'success', rows_written: duplicate ? 0 : 1, rows_skipped: duplicate ? 1 : 0,
      finished_at: new Date().toISOString(),
    });
    return { duplicate, updatedTransaction: applied.updatedTransaction, warnings: normalized.warnings };
  } catch (error) {
    await input.repository.finishSyncRun(runId, {
      status: 'failed', error_code: 'webhook_persistence_failed',
      error_message: 'Falha ao persistir evento Hotmart.', finished_at: new Date().toISOString(),
    }).catch(() => undefined);
    throw error;
  }
}

const RECONCILIATION_STATUSES = ['APPROVED', 'COMPLETE', 'REFUNDED', 'CHARGEBACK', 'CANCELLED'] as const;

export async function reconcileHotmart(input: {
  repository: EdgeRepository;
  startDate?: string;
  endDate?: string;
  buyerHmacSecret?: string;
  readHistory?: typeof readHotmartHistory;
  now?: Date;
}) {
  const now = input.now || new Date();
  const defaults = defaultDateRange(35, now);
  const range = validateDateRange(input.startDate || defaults.startDate, input.endDate || defaults.endDate);
  const reader = input.readHistory || readHotmartHistory;
  const runId = crypto.randomUUID();
  const run: SyncRunRecord = {
    run_id: runId, source: 'hotmart_reconciliation', job_type: 'sales_history', status: 'running',
    requested_start: range.startDate, requested_end: range.endDate, source_watermark: null,
    rows_read: 0, rows_written: 0, rows_skipped: 0, repairs: 0, warnings: [],
    error_code: null, error_message: null, started_at: now.toISOString(), finished_at: null,
  };
  await input.repository.createSyncRun(run);
  let rowsRead = 0; let rowsWritten = 0; let rowsSkipped = 0; let repairs = 0;
  const warnings = new Set<string>(); const failedStatuses: string[] = []; const readStatuses: string[] = [];
  try {
    for (const status of RECONCILIATION_STATUSES) {
      let rows: unknown[];
      try { rows = await reader(range.startDate, range.endDate, status); }
      catch { failedStatuses.push(status); continue; }
      readStatuses.push(status);
      rowsRead += rows.length;
      for (const row of rows) {
        try {
          const normalized = await normalizeHotmartPayload(row, {
            source: 'reconciliation', buyerHmacSecret: input.buyerHmacSecret, now,
            eventType: `RECONCILIATION_${status}`,
          });
          normalized.warnings.forEach(warning => warnings.add(warning));
          const applied = await input.repository.applyHotmartEvent(normalized.event, normalized.transaction);
          if (applied.insertedEvent) rowsWritten += 1; else rowsSkipped += 1;
          if (applied.repairedTransaction) repairs += 1;
        } catch (error) {
          if (error instanceof CommercialIntelligenceError && error.statusCode === 400) {
            rowsSkipped += 1; warnings.add('invalid_hotmart_row'); continue;
          }
          throw error;
        }
      }
    }
    if (failedStatuses.length) warnings.add(`hotmart_partial_statuses:${failedStatuses.join(',')}`);
    if (!readStatuses.length) {
      warnings.add('hotmart_no_statuses_read');
      throw new CommercialIntelligenceError(
        'hotmart_no_statuses_read',
        'A Hotmart não devolveu nenhum grupo de status; a reconciliação falhou.',
        502,
      );
    }
    const status = failedStatuses.length || warnings.has('invalid_hotmart_row') ? 'partial' : 'success';
    await input.repository.finishSyncRun(runId, {
      status, source_watermark: range.endDate, rows_read: rowsRead, rows_written: rowsWritten,
      rows_skipped: rowsSkipped, repairs, warnings: [...warnings], finished_at: new Date().toISOString(),
    });
    return { runId, status, rowsRead, rowsWritten, rowsSkipped, repairs, warnings: [...warnings] };
  } catch (error) {
    await input.repository.finishSyncRun(runId, {
      status: 'failed', rows_read: rowsRead, rows_written: rowsWritten, rows_skipped: rowsSkipped,
      repairs, warnings: [...warnings],
      error_code: error instanceof CommercialIntelligenceError ? error.code : 'hotmart_reconciliation_failed',
      error_message: 'Falha durante a reconciliação Hotmart.', finished_at: new Date().toISOString(),
    }).catch(() => undefined);
    throw error;
  }
}
