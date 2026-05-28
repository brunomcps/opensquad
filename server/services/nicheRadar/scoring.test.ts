import { test } from 'node:test';
import assert from 'node:assert/strict';
import { outlierScore, velocity, combinedScore } from './scoring.js';

const close = (a: number, b: number, eps = 0.5) =>
  assert.ok(Math.abs(a - b) <= eps, `esperado ${a} ~ ${b}`);

// outlierScore
test('outlierScore: vídeo na média do canal dá ~1', () => {
  close(outlierScore(1000, [900, 1000, 1100]), 1);
});
test('outlierScore: 5x a média dá ~5', () => {
  close(outlierScore(5000, [900, 1000, 1100]), 5);
});
test('outlierScore: lista vazia retorna 0', () => {
  assert.equal(outlierScore(5000, []), 0);
});
test('outlierScore: média zero retorna 0', () => {
  assert.equal(outlierScore(5000, [0, 0]), 0);
});

// velocity
test('velocity: dois snapshots dão views/dia', () => {
  const snaps = [
    { snap_date: '2026-05-26', views: 1000 },
    { snap_date: '2026-05-28', views: 5000 },
  ];
  close(velocity(snaps), 2000, 1);
});
test('velocity: um snapshot + publishedAt aproxima por idade', () => {
  const snaps = [{ snap_date: '2026-05-28', views: 3000 }];
  close(velocity(snaps, '2026-05-25'), 1000, 1);
});
test('velocity: sem dados retorna 0', () => {
  assert.equal(velocity([]), 0);
});

// combinedScore
test('combinedScore: sinais no teto dão 100', () => {
  close(combinedScore({ outlier: 10, velocity: 10000 }), 100);
});
test('combinedScore: sinais zerados dão 0', () => {
  assert.equal(combinedScore({ outlier: 0, velocity: 0 }), 0);
});
test('combinedScore: peso 100/0 ignora a velocidade', () => {
  close(combinedScore({ outlier: 10, velocity: 0 }, { outlier: 1, velocity: 0 }), 100);
});
test('combinedScore: acima do teto satura em 100', () => {
  close(combinedScore({ outlier: 50, velocity: 99999 }), 100);
});
