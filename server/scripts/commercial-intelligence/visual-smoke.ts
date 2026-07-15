import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const executableCandidates = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean) as string[];
const executablePath = executableCandidates.find(candidate => fs.existsSync(candidate));
if (!executablePath) throw new Error('Chrome ou Edge não encontrado para o smoke visual.');

const baseUrl = process.env.CI_PREVIEW_URL || 'http://127.0.0.1:4175';
const evidence = path.resolve(
  process.cwd(),
  'docs/commercial-intelligence/evidence/free-deployment',
);
fs.mkdirSync(evidence, { recursive: true });

const browser = await chromium.launch({ executablePath, headless: true });
try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  await desktop.goto(baseUrl, { waitUntil: 'networkidle' });
  await desktop.getByRole('heading', { name: 'Inteligência Comercial' }).waitFor();
  await desktop.locator('input[type="email"]').waitFor();
  await desktop.locator('input[type="password"]').waitFor();
  await desktop.screenshot({ path: path.join(evidence, 'login-desktop.png'), fullPage: true });

  await desktop.getByRole('button', { name: 'Esqueci minha senha' }).click();
  await desktop.getByRole('button', { name: 'Enviar instruções' }).waitFor();
  if (await desktop.locator('input[type="password"]').count()) {
    throw new Error('Tela de solicitação de recuperação exibiu campo de senha.');
  }
  await desktop.screenshot({ path: path.join(evidence, 'reset-desktop.png'), fullPage: true });

  const recovery = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  await recovery.goto(`${baseUrl}/?recovery=1`, { waitUntil: 'networkidle' });
  await recovery.getByRole('button', { name: 'Salvar nova senha' }).waitFor();
  await recovery.locator('input[type="password"]').waitFor();
  if (await recovery.locator('input[type="email"]').count()) {
    throw new Error('Tela de definição de senha exibiu campo de e-mail.');
  }
  await recovery.getByRole('button', { name: 'Solicitar novo link' }).waitFor();
  await recovery.screenshot({ path: path.join(evidence, 'update-password-desktop.png'), fullPage: true });

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto(baseUrl, { waitUntil: 'networkidle' });
  await mobile.getByRole('heading', { name: 'Inteligência Comercial' }).waitFor();
  const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 1) throw new Error(`Layout mobile possui overflow horizontal de ${overflow}px.`);
  await mobile.screenshot({ path: path.join(evidence, 'login-mobile.png'), fullPage: true });

  console.log(JSON.stringify({
    ok: true,
    browser: path.basename(executablePath),
    desktop: 'login-desktop.png',
    reset: 'reset-desktop.png',
    updatePassword: 'update-password-desktop.png',
    mobile: 'login-mobile.png',
    mobileOverflowPx: overflow,
  }));
} finally {
  await browser.close();
}
