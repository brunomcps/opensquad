import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  authErrorMessage,
  hasRecoveryContext,
  recoveryRedirectUrl,
} from '../../../ci-app/src/authRecovery.ts';

test('gera retorno de recuperação explícito na origem estável', () => {
  assert.equal(
    recoveryRedirectUrl('https://opensquad-commercial-intelligence.pages.dev'),
    'https://opensquad-commercial-intelligence.pages.dev/',
  );
});

test('reconhece recuperação na query ou no fragmento sem depender do token', () => {
  assert.equal(hasRecoveryContext('https://app.example/?recovery=1'), true);
  assert.equal(hasRecoveryContext('https://app.example/#access_token=redacted&type=recovery'), true);
  assert.equal(hasRecoveryContext('https://app.example/#type=signup'), false);
  assert.equal(hasRecoveryContext('valor-inválido'), false);
});

test('traduz erros de autenticação em mensagens úteis e seguras', () => {
  assert.equal(authErrorMessage('login', { code: 'invalid_credentials', status: 400 }), 'E-mail ou senha inválidos.');
  assert.match(authErrorMessage('reset', { code: 'over_email_send_rate_limit', status: 429 }), /Muitas solicitações/);
  assert.match(authErrorMessage('update', { code: 'otp_expired', status: 401 }), /link expirou/);
  assert.match(authErrorMessage('update', { code: 'same_password', status: 422 }), /diferente/);
});

test('interface encerra apenas a sessão local do navegador', async () => {
  const source = await readFile(new URL('../../../ci-app/src/CommercialIntelligenceApp.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /\.auth\.signOut\(\s*\)/);
  assert.equal(source.match(/\.auth\.signOut\(\{\s*scope:\s*'local'\s*\}\)/g)?.length, 2);
});
