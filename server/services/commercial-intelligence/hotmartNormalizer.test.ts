import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  normalizeHotmartPayload,
  normalizeHotmartStatus,
  toIsoDate,
} from './hotmartNormalizer.js';

const fixtureDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../fixtures/commercial-intelligence',
);
const approved = JSON.parse(
  fs.readFileSync(path.join(fixtureDir, 'hotmart-approved.json'), 'utf8'),
);

test('normaliza status Hotmart para categorias canônicas', () => {
  assert.equal(normalizeHotmartStatus('APPROVED'), 'approved');
  assert.equal(normalizeHotmartStatus('COMPLETE'), 'approved');
  assert.equal(normalizeHotmartStatus('REFUNDED'), 'refunded');
  assert.equal(normalizeHotmartStatus('CHARGEBACK'), 'chargeback');
  assert.equal(normalizeHotmartStatus('qualquer-coisa'), 'unknown');
});

test('normaliza timestamp Hotmart em segundos ou milissegundos', () => {
  assert.equal(toIsoDate(1_783_632_600), '2026-07-09T21:30:00.000Z');
  assert.equal(toIsoDate(1_783_632_600_000), '2026-07-09T21:30:00.000Z');
});

test('remove PII e preserva valores oficiais e origem', () => {
  const normalized = normalizeHotmartPayload(approved, {
    source: 'webhook',
    buyerHmacSecret: 'fixture-secret',
    now: new Date('2026-07-10T12:00:00.000Z'),
  });

  assert.equal(normalized.transaction.status, 'approved');
  assert.equal(normalized.transaction.producer_net_value, 177.3);
  assert.equal(normalized.transaction.producer_net_currency, 'BRL');
  assert.equal(normalized.transaction.tracking_sck, 'yt|fixture|desc');
  assert.equal(normalized.transaction.buyer_key?.length, 64);
  assert.equal(normalized.warnings.length, 0);

  const serialized = JSON.stringify(normalized);
  assert.equal(serialized.includes('buyer@example.test'), false);
  assert.equal(serialized.includes('Pessoa Teste'), false);
  assert.equal(serialized.includes('fixture-buyer-001'), false);
});

test('mantém buyer_key nulo e sinaliza segredo ausente', () => {
  const normalized = normalizeHotmartPayload(approved, {
    source: 'webhook',
    now: new Date('2026-07-10T12:00:00.000Z'),
  });
  assert.equal(normalized.transaction.buyer_key, null);
  assert.deepEqual(normalized.warnings, ['buyer_hmac_secret_missing']);
});

test('aceita origem da API de histórico em purchase.tracking.source', () => {
  const historyPayload = {
    product: { id: 6966825, name: 'MAPA-7P' },
    purchase: {
      transaction: 'HISTORY-TX-001',
      status: 'APPROVED',
      order_date: 1_784_106_198_000,
      approved_date: 1_784_106_203_000,
      price: { value: 154.72, currency_code: 'BRL' },
      hotmart_fee: { total: 15.07, currency_code: 'BRL' },
      offer: { code: 'vyqym0gx' },
      tracking: { source: 'yt|WrWsJ4MjP04|d|e17e' },
    },
  };

  const normalized = normalizeHotmartPayload(historyPayload, {
    source: 'reconciliation',
    now: new Date('2026-07-15T12:00:00.000Z'),
  });

  assert.equal(normalized.transaction.tracking_src, 'yt|WrWsJ4MjP04|d|e17e');
  assert.equal(normalized.transaction.gross_currency, 'BRL');
  assert.equal(normalized.transaction.fee_currency, 'BRL');
  assert.equal(normalized.transaction.last_reconciled_at, '2026-07-15T12:00:00.000Z');
});

test('preserva comissão líquida quando webhook omite moeda bruta e taxa', () => {
  const webhookPayload = {
    id: 'incomplete-webhook-001',
    event: 'PURCHASE_APPROVED',
    creation_date: 1_784_106_215_084,
    data: {
      product: { id: 6966825, name: 'MAPA-7P' },
      commission: { value: 127.03, currency_value: 'BRL' },
      purchase: {
        transaction: 'WEBHOOK-TX-001',
        status: 'APPROVED',
        order_date: 1_784_106_198_000,
        approved_date: 1_784_106_203_000,
        price: { value: 142.1 },
        payment: { type: 'CREDIT_CARD' },
        offer: { code: 'vyqym0gx' },
        origin: { src: 'yt|WrWsJ4MjP04|d|e17e' },
      },
    },
  };

  const normalized = normalizeHotmartPayload(webhookPayload, {
    source: 'webhook',
    now: new Date('2026-07-15T11:03:37.000Z'),
  });

  assert.equal(normalized.transaction.gross_value, 142.1);
  assert.equal(normalized.transaction.gross_currency, null);
  assert.equal(normalized.transaction.fee_value, null);
  assert.equal(normalized.transaction.fee_currency, null);
  assert.equal(normalized.transaction.producer_net_value, 127.03);
  assert.equal(normalized.transaction.producer_net_currency, 'BRL');
  assert.equal(normalized.transaction.tracking_src, 'yt|WrWsJ4MjP04|d|e17e');
});
