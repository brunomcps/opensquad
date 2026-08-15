import test from 'node:test';
import assert from 'node:assert/strict';
import { toHotmartMillis } from './hotmart.js';

test('intervalo Hotmart cobre o dia inteiro em America/Sao_Paulo', () => {
  assert.equal(
    new Date(Number(toHotmartMillis('2026-07-10'))).toISOString(),
    '2026-07-10T03:00:00.000Z',
  );
  assert.equal(
    new Date(Number(toHotmartMillis('2026-07-10', true))).toISOString(),
    '2026-07-11T02:59:59.999Z',
  );
});
