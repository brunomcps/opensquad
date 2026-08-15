import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CommercialIntelligenceError } from './contracts.js';
import { InMemoryCommercialIntelligenceRepository } from './repository.js';
import { processHotmartWebhook } from './hotmartWebhook.js';

const fixtureDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../fixtures/commercial-intelligence',
);
const approved = JSON.parse(fs.readFileSync(path.join(fixtureDir, 'hotmart-approved.json'), 'utf8'));
const refunded = JSON.parse(fs.readFileSync(path.join(fixtureDir, 'hotmart-refunded.json'), 'utf8'));

test('recusa webhook quando HOTTOK não está configurado', async () => {
  const repository = new InMemoryCommercialIntelligenceRepository();
  await assert.rejects(
    processHotmartWebhook({ payload: approved, repository }),
    (error: unknown) => error instanceof CommercialIntelligenceError
      && error.code === 'webhook_not_configured'
      && error.statusCode === 503,
  );
});

test('recusa HOTTOK inválido', async () => {
  const repository = new InMemoryCommercialIntelligenceRepository();
  await assert.rejects(
    processHotmartWebhook({
      payload: approved,
      repository,
      configuredSecret: 'expected',
      receivedSecret: 'invalid',
    }),
    (error: unknown) => error instanceof CommercialIntelligenceError
      && error.code === 'invalid_hottok'
      && error.statusCode === 401,
  );
});

test('processa evento repetido uma vez', async () => {
  const repository = new InMemoryCommercialIntelligenceRepository();
  const input = {
    payload: approved,
    repository,
    configuredSecret: 'fixture-hottok',
    receivedSecret: 'fixture-hottok',
    buyerHmacSecret: 'fixture-hmac',
    now: new Date('2026-07-10T12:00:00.000Z'),
  };

  const first = await processHotmartWebhook(input);
  const duplicate = await processHotmartWebhook(input);

  assert.equal(first.duplicate, false);
  assert.equal(duplicate.duplicate, true);
  assert.equal(repository.hotmartEvents.size, 1);
  assert.equal(repository.hotmartTransactions.size, 1);
});

test('reembolso corrige snapshot sem apagar evento aprovado', async () => {
  const repository = new InMemoryCommercialIntelligenceRepository();
  const base = {
    repository,
    configuredSecret: 'fixture-hottok',
    receivedSecret: 'fixture-hottok',
    buyerHmacSecret: 'fixture-hmac',
    now: new Date('2026-07-11T12:00:00.000Z'),
  };

  await processHotmartWebhook({ ...base, payload: approved });
  await processHotmartWebhook({ ...base, payload: refunded });

  assert.equal(repository.hotmartEvents.size, 2);
  assert.equal(repository.hotmartTransactions.get('FIXTURE-TX-001')?.status, 'refunded');
});
