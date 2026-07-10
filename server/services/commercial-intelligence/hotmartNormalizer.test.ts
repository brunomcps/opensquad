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
