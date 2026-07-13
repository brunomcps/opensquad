import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { chromium, type Page } from 'playwright-core';

const supabaseUrl = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const appUrl = process.env.CI_SMOKE_APP_URL;
const email = process.env.CI_SMOKE_EMAIL;
if (!supabaseUrl || !publishableKey || !serviceRoleKey || !appUrl || !email) {
  throw new Error('SUPABASE_URL, SUPABASE_KEY, SUPABASE_SERVICE_ROLE_KEY, CI_SMOKE_APP_URL e CI_SMOKE_EMAIL são obrigatórios.');
}
const targetAppUrl = appUrl;

const executableCandidates = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean) as string[];
const executablePath = executableCandidates.find(candidate => fs.existsSync(candidate));
if (!executablePath) throw new Error('Chrome ou Edge não encontrado para o smoke de produção.');

const authOptions = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(supabaseUrl, serviceRoleKey, authOptions);
const anon = createClient(supabaseUrl, publishableKey, authOptions);
const generated = await admin.auth.admin.generateLink({
  type: 'magiclink',
  email,
  options: { redirectTo: targetAppUrl },
});
if (generated.error) throw generated.error;
const verified = await anon.auth.verifyOtp({
  token_hash: generated.data.properties.hashed_token,
  type: 'magiclink',
});
if (verified.error || !verified.data.session) throw verified.error || new Error('Sessão temporária ausente.');

const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
const storageKey = `sb-${projectRef}-auth-token`;
const session = verified.data.session;
const evidence = path.resolve(process.cwd(), 'docs/commercial-intelligence/evidence/commercial-overview');
fs.mkdirSync(evidence, { recursive: true });

async function prepare(page: Page) {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, JSON.stringify(value)), [storageKey, session] as const);
  await page.goto(targetAppUrl, { waitUntil: 'networkidle' });
  await page.getByText('Líquido após taxas', { exact: true }).first().waitFor({ timeout: 20_000 });
  await page.waitForTimeout(800);
}

const browser = await chromium.launch({ executablePath, headless: true });
let report: Record<string, unknown> | null = null;
try {
  const desktop = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  await prepare(desktop);
  const desktopOverflow = await desktop.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (desktopOverflow > 1) throw new Error(`Produção desktop possui overflow horizontal de ${desktopOverflow}px.`);
  await desktop.screenshot({ path: path.join(evidence, 'production-desktop-1366.png') });

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await prepare(mobile);
  const mobileOverflow = await mobile.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (mobileOverflow > 1) throw new Error(`Produção mobile possui overflow horizontal de ${mobileOverflow}px.`);
  await mobile.screenshot({ path: path.join(evidence, 'production-mobile-390.png') });

  const kpis = await desktop.locator('.ci-kpi-card > strong').allTextContents();
  report = {
    ok: true,
    appStatus: 'authenticated',
    desktopOverflowPx: desktopOverflow,
    mobileOverflowPx: mobileOverflow,
    kpiCount: kpis.length,
    hasNetAfterFees: await desktop.getByText('Líquido após taxas', { exact: true }).first().isVisible(),
    hasProducts: await desktop.getByText('Produtos', { exact: true }).isVisible(),
    hasQualityTab: await desktop.getByRole('button', { name: 'Qualidade dos dados' }).isVisible(),
  };
} finally {
  await browser.close();
}
const signedOut = await anon.auth.signOut();
if (signedOut.error) throw signedOut.error;
console.log(JSON.stringify({ ...report, sessionRevoked: true }));
