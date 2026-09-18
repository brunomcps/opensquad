import assert from 'node:assert/strict';
import test from 'node:test';
import {
  brtDateInput,
  conversionRate,
  isCurrentTrackingRequest,
  isExpectedHotmartSchedule,
  mergeTrackingEventPages,
  purchaseStatusPresentation,
  TRACKING_SINCE_DATE,
  trackingFiltersKey,
  trackingHealthLights,
  trackingPeriodLabel,
  trackingPresetRange,
} from '../../../src/components/commercial-intelligence/trackingHistoryModel';

test('data inicial da interface respeita o dia civil de Brasília', () => {
  assert.equal(brtDateInput(new Date('2026-07-16T01:30:00.000Z')), '2026-07-15');
  assert.equal(brtDateInput(new Date('2026-07-16T03:30:00.000Z')), '2026-07-16');
});

test('interface só afirma 06:40 BRT quando a agenda exata está ativa', () => {
  assert.equal(isExpectedHotmartSchedule(true, '40 9 * * *'), true);
  assert.equal(isExpectedHotmartSchedule(true, '0 9 * * *'), false);
  assert.equal(isExpectedHotmartSchedule(false, '40 9 * * *'), false);
  assert.equal(isExpectedHotmartSchedule(true, null), false);
});

test('status Hotmart vira evento e badge em português sem pintar falhas de verde', () => {
  assert.deepEqual(purchaseStatusPresentation('approved'), {
    eventLabel: 'Compra aprovada', statusLabel: 'Aprovada', tone: 'approved',
  });
  assert.deepEqual(purchaseStatusPresentation('refunded'), {
    eventLabel: 'Reembolso', statusLabel: 'Reembolsada', tone: 'refunded',
  });
  assert.deepEqual(purchaseStatusPresentation('chargeback'), {
    eventLabel: 'Chargeback', statusLabel: 'Chargeback', tone: 'chargeback',
  });
  assert.equal(purchaseStatusPresentation('canceled').eventLabel, 'Transação cancelada');
  assert.equal(purchaseStatusPresentation('blocked').tone, 'blocked');
  assert.equal(purchaseStatusPresentation('unexpected_status').statusLabel, 'Status desconhecido');
});

test('resposta antiga não pode entrar depois que o filtro ou a sequência mudou', () => {
  const first = trackingFiltersKey({
    start: '2026-07-01', end: '2026-07-07', granularity: 'day', videoId: null, position: 'all', traffic: 'qualified',
  });
  const second = trackingFiltersKey({
    start: '2026-07-08', end: '2026-07-14', granularity: 'day', videoId: null, position: 'all', traffic: 'qualified',
  });

  assert.equal(isCurrentTrackingRequest({
    requestId: 4, currentRequestId: 4, requestFilterKey: first, currentFilterKey: first,
  }), true);
  assert.equal(isCurrentTrackingRequest({
    requestId: 4, currentRequestId: 5, requestFilterKey: first, currentFilterKey: first,
  }), false);
  assert.equal(isCurrentTrackingRequest({
    requestId: 4, currentRequestId: 4, requestFilterKey: first, currentFilterKey: second,
  }), false);
});

test('paginação acrescenta somente eventos inéditos', () => {
  const merged = mergeTrackingEventPages(
    [{ eventId: 'sale:2' }, { eventId: 'click:1' }],
    [{ eventId: 'click:1' }, { eventId: 'click:0' }],
  );
  assert.deepEqual(merged.map(event => event.eventId), ['sale:2', 'click:1', 'click:0']);
});

test('"Desde o início" começa no dia do primeiro link e os outros presets contam até hoje', () => {
  assert.deepEqual(trackingPresetRange('all', '2026-09-18'), { start: TRACKING_SINCE_DATE, end: '2026-09-18' });
  assert.deepEqual(trackingPresetRange('today', '2026-09-18'), { start: '2026-09-18', end: '2026-09-18' });
  assert.deepEqual(trackingPresetRange('7d', '2026-09-18'), { start: '2026-09-12', end: '2026-09-18' });
});

test('cada número da tela ganha o período escrito por extenso', () => {
  assert.equal(trackingPeriodLabel('2026-07-14', '2026-09-18', '2026-09-18'), 'desde 14/07');
  assert.equal(trackingPeriodLabel('2026-09-18', '2026-09-18', '2026-09-18'), 'hoje');
  assert.equal(trackingPeriodLabel('2026-09-12', '2026-09-18', '2026-09-18'), 'últimos 7 dias · 12/09 a 18/09');
  assert.equal(trackingPeriodLabel('2026-08-01', '2026-08-15', '2026-09-18'), 'de 01/08 a 15/08');
});

test('conversão só é afirmada com volume mínimo de cliques', () => {
  assert.equal(conversionRate(1, 3), null);
  assert.equal(conversionRate(1, 49), null);
  assert.equal(conversionRate(1, 50), 0.02);
  assert.equal(conversionRate(0, 0), null);
});

test('luzes de saúde: verde recente, amarelo atrasado, vermelho parado, cinza sem dado', () => {
  const now = Date.parse('2026-09-18T18:00:00.000Z');
  const hoursAgo = (hours: number) => new Date(now - hours * 3_600_000).toISOString();
  const lights = trackingHealthLights({
    lastClickAt: hoursAgo(2),
    lastQualifiedClickAt: hoursAgo(3),
    lastHotmartWebhookAt: hoursAgo(60),
    lastHotmartReconciliationAt: hoursAgo(12),
    lastHotmartReconciliationSuccessAt: hoursAgo(12),
    lastHotmartReconciliationStatus: 'success',
    nextHotmartReconciliationAt: '2026-09-19T09:40:00.000Z',
    hotmartScheduleActive: true,
    hotmartScheduleExpression: '40 9 * * *',
  }, now);
  assert.deepEqual(lights.map(light => [light.key, light.tone]), [['clicks', 'ok'], ['sales', 'warn'], ['reconciliation', 'ok']]);
  assert.match(lights[0].detail, /^último \d\d\/\d\d \d\d:\d\d$/);
  assert.match(lights[2].detail, /próxima 19\/09 06:40/);

  const stalled = trackingHealthLights({
    lastClickAt: hoursAgo(100),
    lastHotmartWebhookAt: null,
    lastHotmartReconciliationAt: hoursAgo(12),
    lastHotmartReconciliationStatus: 'failed',
    nextHotmartReconciliationAt: null,
  }, now);
  assert.deepEqual(stalled.map(light => light.tone), ['bad', 'unknown', 'bad']);
});

test('trocar o canal muda a chave da consulta (resposta do YouTube não serve pro Instagram)', () => {
  const base = { start: '2026-07-14', end: '2026-09-18', granularity: 'day', videoId: null, position: 'all', traffic: 'qualified' };
  const all = trackingFiltersKey({ ...base, channel: 'all' });
  assert.equal(all, trackingFiltersKey(base), '"all" e ausente são a mesma consulta');
  assert.notEqual(all, trackingFiltersKey({ ...base, channel: 'instagram' }));
});
