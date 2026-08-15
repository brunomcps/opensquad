import test from 'node:test';
import assert from 'node:assert/strict';
import type { CommercialIntelligenceRepository } from './contracts.js';
import { getDataQualityReport } from './dataQuality.js';
import { enumerateDates } from './dateRange.js';
import { InMemoryCommercialIntelligenceRepository } from './repository.js';

test('qualidade mostra configuração ausente sem consultar banco', async () => {
  const repository = { configured: false } as CommercialIntelligenceRepository;
  const report = await getDataQualityReport({
    repository,
    hotmartWebhookConfigured: false,
    buyerHmacConfigured: false,
    now: new Date('2026-07-10T15:00:00.000Z'),
  });
  assert.equal(report.overallStatus, 'not_configured');
  assert.ok(report.alerts.includes('database_not_configured'));
  assert.ok(report.alerts.includes('webhook_not_configured'));
  assert.ok(report.alerts.includes('buyer_hmac_secret_missing'));
});

test('qualidade fica saudável com fontes recentes e cobertura completa', async () => {
  const repository = new InMemoryCommercialIntelligenceRepository();
  const now = new Date('2026-07-10T15:00:00.000Z');
  const start = '2026-06-06';
  const end = '2026-07-10';

  for (const [index, date] of enumerateDates(start, end).entries()) {
    repository.youtubeDaily.set(`fixture:${date}`, {
      video_id: 'fixture',
      metric_date: date,
      views: index,
      estimated_minutes_watched: index,
      likes: null,
      comments: null,
      shares: null,
      subscribers_gained: null,
      subscribers_lost: null,
      source_updated_at: now.toISOString(),
    });
  }

  for (const source of ['youtube', 'hotmart_webhook', 'hotmart_reconciliation'] as const) {
    await repository.createSyncRun({
      run_id: `run-${source}`,
      source,
      job_type: 'fixture',
      status: 'success',
      requested_start: start,
      requested_end: end,
      source_watermark: end,
      rows_read: 35,
      rows_written: 35,
      rows_skipped: 0,
      repairs: 0,
      warnings: [],
      error_code: null,
      error_message: null,
      started_at: '2026-07-10T14:00:00.000Z',
      finished_at: '2026-07-10T14:01:00.000Z',
    });
  }

  const report = await getDataQualityReport({
    repository,
    hotmartWebhookConfigured: true,
    buyerHmacConfigured: true,
    now,
  });
  assert.equal(report.overallStatus, 'healthy');
  assert.equal(report.coverage.youtubeDatesPresent, 35);
  assert.deepEqual(report.coverage.youtubeMissingDates, []);
  assert.deepEqual(report.alerts, []);
});
