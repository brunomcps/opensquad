import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { reconcileHotmart } from './hotmartReconcile.js';
import { InMemoryCommercialIntelligenceRepository } from './repository.js';

const fixtureDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../fixtures/commercial-intelligence',
);
const approved = JSON.parse(fs.readFileSync(path.join(fixtureDir, 'hotmart-approved.json'), 'utf8'));
const refunded = JSON.parse(fs.readFileSync(path.join(fixtureDir, 'hotmart-refunded.json'), 'utf8'));

test('reconciliação encontra compra e corrige reembolso posterior', async () => {
  const repository = new InMemoryCommercialIntelligenceRepository();
  const result = await reconcileHotmart({
    repository,
    startDate: '2026-07-01',
    endDate: '2026-07-10',
    buyerHmacSecret: 'fixture-hmac',
    now: new Date('2026-07-10T15:00:00.000Z'),
    readHistory: async (_start, _end, status) => {
      if (status === 'APPROVED') return [approved];
      if (status === 'REFUNDED') return [refunded];
      return [];
    },
  });

  assert.equal(result.status, 'success');
  assert.equal(result.rowsRead, 2);
  assert.equal(result.rowsWritten, 2);
  assert.equal(result.repairs, 1);
  assert.equal(repository.hotmartEvents.size, 2);
  assert.equal(repository.hotmartTransactions.get('FIXTURE-TX-001')?.status, 'refunded');
});

test('falha de um status mantém resultado parcial observável', async () => {
  const repository = new InMemoryCommercialIntelligenceRepository();
  const result = await reconcileHotmart({
    repository,
    startDate: '2026-07-01',
    endDate: '2026-07-10',
    now: new Date('2026-07-10T15:00:00.000Z'),
    readHistory: async (_start, _end, status) => {
      if (status === 'CHARGEBACK') throw new Error('fixture failure');
      return [];
    },
  });
  assert.equal(result.status, 'partial');
  assert.ok(result.warnings.includes('hotmart_partial_statuses:CHARGEBACK'));
});
