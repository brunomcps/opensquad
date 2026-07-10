import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createCommercialIntelligenceRouter } from './commercialIntelligence.js';
import { InMemoryCommercialIntelligenceRepository } from '../services/commercial-intelligence/repository.js';

const fixturePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../fixtures/commercial-intelligence/hotmart-approved.json',
);
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

test('rota do webhook valida header, deduplica e não ecoa PII', async () => {
  const previousHottok = process.env.HOTMART_HOTTOK;
  const previousHmac = process.env.CI_BUYER_HMAC_SECRET;
  process.env.HOTMART_HOTTOK = 'fixture-hottok';
  process.env.CI_BUYER_HMAC_SECRET = 'fixture-hmac';

  const repository = new InMemoryCommercialIntelligenceRepository();
  const app = express();
  app.use(express.json());
  app.use('/api/commercial-intel', createCommercialIntelligenceRouter(repository));
  const server = app.listen(0, '127.0.0.1');

  try {
    await new Promise<void>(resolve => server.once('listening', resolve));
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    const url = `http://127.0.0.1:${address.port}/api/commercial-intel/hotmart/webhook`;

    const invalid = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-hotmart-hottok': 'wrong' },
      body: JSON.stringify(fixture),
    });
    assert.equal(invalid.status, 401);

    const first = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-hotmart-hottok': 'fixture-hottok' },
      body: JSON.stringify(fixture),
    });
    const firstBody = await first.json();
    assert.equal(first.status, 200);
    assert.equal(firstBody.duplicate, false);

    const duplicate = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-hotmart-hottok': 'fixture-hottok' },
      body: JSON.stringify(fixture),
    });
    const duplicateBody = await duplicate.json();
    assert.equal(duplicateBody.duplicate, true);

    const serialized = JSON.stringify([firstBody, duplicateBody]);
    assert.equal(serialized.includes('buyer@example.test'), false);
    assert.equal(serialized.includes('Pessoa Teste'), false);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close(error => error ? reject(error) : resolve()));
    if (previousHottok === undefined) delete process.env.HOTMART_HOTTOK;
    else process.env.HOTMART_HOTTOK = previousHottok;
    if (previousHmac === undefined) delete process.env.CI_BUYER_HMAC_SECRET;
    else process.env.CI_BUYER_HMAC_SECRET = previousHmac;
  }
});
