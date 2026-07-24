import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import analyticsRouter from './analytics.js';

test('análise legada fica desabilitada por padrão', async () => {
  const previous = process.env.ENABLE_LEGACY_CONTENT_REVENUE;
  delete process.env.ENABLE_LEGACY_CONTENT_REVENUE;
  const app = express();
  app.use('/api/analytics', analyticsRouter);
  const server = app.listen(0, '127.0.0.1');
  try {
    await new Promise<void>(resolve => server.once('listening', resolve));
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    const response = await fetch(`http://127.0.0.1:${address.port}/api/analytics/content-revenue`);
    const payload = await response.json();
    assert.equal(response.status, 410);
    assert.equal(payload.error.code, 'legacy_analysis_disabled');
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    if (previous === undefined) delete process.env.ENABLE_LEGACY_CONTENT_REVENUE;
    else process.env.ENABLE_LEGACY_CONTENT_REVENUE = previous;
  }
});
