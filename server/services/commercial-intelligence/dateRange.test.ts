import test from 'node:test';
import assert from 'node:assert/strict';
import {
  businessDate,
  defaultDateRange,
  enumerateDates,
  validateDateRange,
} from './dateRange.js';

test('usa America/Sao_Paulo para a data de negócio', () => {
  assert.equal(businessDate(new Date('2026-07-10T02:00:00.000Z')), '2026-07-09');
});

test('gera janela móvel inclusiva de 35 dias', () => {
  assert.deepEqual(defaultDateRange(35, new Date('2026-07-10T15:00:00.000Z')), {
    startDate: '2026-06-06',
    endDate: '2026-07-10',
  });
});

test('rejeita intervalo invertido ou maior que 370 dias', () => {
  assert.throws(() => validateDateRange('2026-07-10', '2026-07-01'));
  assert.throws(() => validateDateRange('2025-01-01', '2026-07-10'));
});

test('enumera lacunas sem transformá-las em zero', () => {
  assert.deepEqual(enumerateDates('2026-07-08', '2026-07-10'), [
    '2026-07-08',
    '2026-07-09',
    '2026-07-10',
  ]);
});
