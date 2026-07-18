import assert from 'node:assert/strict';
import test from 'node:test';
import {
  brtDateInput,
  isCurrentTrackingRequest,
  isExpectedHotmartSchedule,
  mergeTrackingEventPages,
  purchaseStatusPresentation,
  trackingFiltersKey,
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
