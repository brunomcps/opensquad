import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isRelevant } from './relevance.js';

test('aceita vídeo legítimo de TDAH', () => {
  assert.equal(isRelevant({ title: 'Como saber se tenho TDAH?', track: 'br' }), true);
});

test('rejeita ASMR', () => {
  assert.equal(isRelevant({ title: 'ASMR Test TDAH roleplay médico', track: 'br' }), false);
});

test('rejeita música/clipe', () => {
  assert.equal(isRelevant({ title: 'TDAH - música oficial', track: 'br' }), false);
});

test('rejeita conteúdo infantil', () => {
  assert.equal(isRelevant({ title: 'Dona Aranha para crianças', track: 'br' }), false);
});

test('rejeita funk/sertanejo', () => {
  assert.equal(isRelevant({ title: 'TDAH (funk remix)', track: 'br' }), false);
});

test('rejeita saúde alternativa fora do nicho (própolis)', () => {
  assert.equal(isRelevant({ title: 'O poder do própolis como antibiótico natural', track: 'br' }), false);
});

test('canal curado bypassa o filtro', () => {
  assert.equal(isRelevant({ title: 'ASMR TDAH', track: 'br' }, { fromCuratedChannel: true }), true);
});

test('título vazio é irrelevante (quando não curado)', () => {
  assert.equal(isRelevant({ title: '', track: 'gringo' }), false);
});
