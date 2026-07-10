import { createHash, createHmac } from 'crypto';
import {
  CommercialIntelligenceError,
  type HotmartEventRecord,
  type HotmartTransactionRecord,
  type NormalizedHotmartStatus,
} from './contracts.js';

type JsonRecord = Record<string, any>;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonRecord
    : {};
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
  if (typeof candidate === 'string' && /^\d+$/.test(candidate)) {
    candidate = Number(candidate);
  }
  if (typeof candidate === 'number' && candidate < 100_000_000_000) {
    candidate *= 1000;
  }
  const date = new Date(candidate);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function normalizeHotmartStatus(status: unknown): NormalizedHotmartStatus {
  const raw = String(status || '').trim().toUpperCase();
  if (raw === 'APPROVED' || raw === 'COMPLETE' || raw === 'COMPLETED') return 'approved';
  if (raw === 'REFUNDED' || raw === 'PARTIALLY_REFUNDED') return 'refunded';
  if (raw === 'CHARGEBACK') return 'chargeback';
  if (raw === 'CANCELLED' || raw === 'CANCELED') return 'canceled';
  if (raw === 'EXPIRED') return 'expired';
  if (raw === 'BLOCKED') return 'blocked';
  if (raw === 'DISPUTE' || raw === 'DISPUTED') return 'disputed';
  return 'unknown';
}

function producerCommission(data: JsonRecord): { value: number | null; currency: string | null } {
  const candidates = [
    ...(Array.isArray(data.commissions) ? data.commissions : []),
    ...(Array.isArray(data.purchase?.commissions) ? data.purchase.commissions : []),
  ].map(asRecord);

  const producer = candidates.find(item => String(item.source || '').toUpperCase() === 'PRODUCER');
  const commission = asRecord(producer?.commission);
  const direct = asRecord(data.commission);
  return {
    value: asNumber(producer?.value ?? commission.value ?? direct.value),
    currency: asString(
      producer?.currency_value
      ?? producer?.currency_code
      ?? commission.currency_value
      ?? commission.currency_code
      ?? direct.currency_value
      ?? direct.currency_code,
    ),
  };
}

function buyerKey(data: JsonRecord, secret?: string): { key: string | null; warning?: string } {
  if (!secret) return { key: null, warning: 'buyer_hmac_secret_missing' };
  const buyer = asRecord(data.buyer);
  const identity = asString(buyer.ucode) || asString(buyer.email);
  if (!identity) return { key: null };
  return {
    key: createHmac('sha256', secret).update(identity).digest('hex'),
  };
}

export interface NormalizedHotmartPayload {
  event: HotmartEventRecord;
  transaction: HotmartTransactionRecord;
  warnings: string[];
}

export interface NormalizeHotmartOptions {
  source: HotmartEventRecord['source'];
  buyerHmacSecret?: string;
  now?: Date;
  eventType?: string;
}

export function normalizeHotmartPayload(
  payload: unknown,
  options: NormalizeHotmartOptions,
): NormalizedHotmartPayload {
  const root = asRecord(payload);
  const data = asRecord(root.data && typeof root.data === 'object' ? root.data : root);
  const purchase = asRecord(data.purchase);
  const product = asRecord(data.product);
  const payment = asRecord(purchase.payment);
  const fee = asRecord(purchase.hotmart_fee);
  const price = asRecord(purchase.price);
  const origin = asRecord(purchase.origin ?? purchase.tracking);
  const offer = asRecord(purchase.offer ?? data.offer);
  const subscription = asRecord(data.subscription ?? purchase.subscription);

  const transactionId = asString(purchase.transaction ?? purchase.transaction_id);
  const rawStatus = asString(purchase.status) || 'UNKNOWN';
  const eventType = asString(options.eventType ?? root.event) || `RECONCILIATION_${rawStatus}`;
  const now = options.now || new Date();
  const orderDate = toIsoDate(purchase.order_date);
  const approvedDate = toIsoDate(purchase.approved_date);
  const occurredAt = toIsoDate(root.creation_date ?? root.event_date)
    || approvedDate
    || orderDate
    || now.toISOString();

  if (!transactionId) {
    throw new CommercialIntelligenceError(
      'invalid_hotmart_payload',
      'Payload Hotmart sem identificador de transação.',
      400,
    );
  }

  const normalizedStatus = normalizeHotmartStatus(rawStatus);
  const buyer = buyerKey(data, options.buyerHmacSecret);
  const commission = producerCommission(data);
  const eventId = asString(root.id);
  const eventKey = eventId
    ? `hotmart:${eventId}`
    : `hotmart:${createHash('sha256')
        .update(JSON.stringify([eventType, transactionId, rawStatus, occurredAt]))
        .digest('hex')}`;
  const grossValue = asNumber(price.value);
  const grossCurrency = asString(price.currency_code);
  const feeValue = asNumber(fee.total);
  const feeCurrency = asString(fee.currency_code);
  const productId = asString(product.id);
  const productName = asString(product.name) || 'Desconhecido';
  const paymentType = asString(payment.type);
  const offerCode = asString(offer.code);
  const subscriptionId = asString(subscription.subscriber_code ?? subscription.id);
  const isRenewal = /RECURR|RENEW/i.test(eventType)
    || Boolean(subscriptionId && purchase.recurrence_number && Number(purchase.recurrence_number) > 1);
  const trackingSrc = asString(origin.src ?? purchase.src);
  const trackingSck = asString(origin.sck ?? purchase.sck);
  const trackingXcod = asString(origin.xcod ?? purchase.xcod);

  const sanitizedPayload: Record<string, unknown> = {
    eventType,
    transactionId,
    rawStatus,
    normalizedStatus,
    product: { id: productId, name: productName },
    purchase: {
      orderDate,
      approvedDate,
      grossValue,
      grossCurrency,
      feeValue,
      feeCurrency,
      producerNetValue: commission.value,
      producerNetCurrency: commission.currency,
      paymentType,
      offerCode,
    },
    origin: { src: trackingSrc, sck: trackingSck, xcod: trackingXcod },
    subscription: { id: subscriptionId, isRenewal },
  };

  const event: HotmartEventRecord = {
    event_key: eventKey,
    transaction_id: transactionId,
    event_type: eventType,
    raw_status: rawStatus,
    normalized_status: normalizedStatus,
    occurred_at: occurredAt,
    source: options.source,
    sanitized_payload: sanitizedPayload,
  };

  const transaction: HotmartTransactionRecord = {
    transaction_id: transactionId,
    buyer_key: buyer.key,
    product_id: productId,
    product_name: productName,
    status: normalizedStatus,
    order_date: orderDate,
    approved_date: approvedDate,
    gross_value: grossValue,
    gross_currency: grossCurrency,
    fee_value: feeValue,
    fee_currency: feeCurrency,
    producer_net_value: commission.value,
    producer_net_currency: commission.currency,
    payment_type: paymentType,
    offer_code: offerCode,
    subscription_id: subscriptionId,
    is_renewal: isRenewal,
    tracking_src: trackingSrc,
    tracking_sck: trackingSck,
    tracking_xcod: trackingXcod,
    last_event_at: occurredAt,
    last_reconciled_at: options.source === 'reconciliation' ? now.toISOString() : null,
  };

  return {
    event,
    transaction,
    warnings: buyer.warning ? [buyer.warning] : [],
  };
}
