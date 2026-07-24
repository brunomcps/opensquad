import fs from 'node:fs';
import path from 'node:path';
import { chromium, type Page } from 'playwright-core';

const executableCandidates = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean) as string[];
const executablePath = executableCandidates.find(candidate => fs.existsSync(candidate));
if (!executablePath) throw new Error('Chrome ou Edge não encontrado para o smoke visual.');

const baseUrl = process.env.CI_PREVIEW_URL || 'http://127.0.0.1:4175';
const supabaseUrl = process.env.VITE_SUPABASE_URL;
if (!supabaseUrl) throw new Error('VITE_SUPABASE_URL é necessária para preparar a sessão visual.');
const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
const storageKey = `sb-${projectRef}-auth-token`;
const evidence = path.resolve(process.cwd(), 'docs/commercial-intelligence/evidence/commercial-overview');
fs.mkdirSync(evidence, { recursive: true });

const now = new Date();
const localDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(now);
const monthStart = `${localDate.slice(0, 8)}01`;

const overviewFixture = {
  ok: true,
  member: { role: 'admin' },
  overview: {
    period: { start: monthStart, end: localDate, timezone: 'America/Sao_Paulo' },
    currency: 'BRL',
    availableCurrencies: ['BRL', 'EUR', 'USD', 'CAD', 'GBP'],
    totals: {
      gross: 47_742.41, fees: 4_916.19, netAfterFees: 42_826.22,
      sales: 483, buyers: 307, averageTicket: 88.67,
      refunds: 14, refundGross: 1_280, chargebacks: 0, chargebackGross: 0, cancellations: 59,
    },
    goal: { value: 50_000, progress: 0.8565, remaining: 7_173.78, requiredDailyPace: 377.57, daysRemaining: 19 },
    daily: Array.from({ length: 13 }, (_, index) => ({
      date: `${localDate.slice(0, 8)}${String(index + 1).padStart(2, '0')}`,
      gross: 2_700 + index * 175,
      fees: 280 + index * 18,
      netAfterFees: 2_420 + index * 157,
      sales: 24 + (index % 5) * 3,
    })),
    products: [
      { key: 'p1', name: 'Ecossistema Cognitivo', sales: 241, buyers: 210, gross: 25_900, fees: 2_600, netAfterFees: 23_300, netShare: 0.544 },
      { key: 'p2', name: 'Formação em TDAH', sales: 132, buyers: 116, gross: 13_000, fees: 1_350, netAfterFees: 11_650, netShare: 0.272 },
      { key: 'p3', name: 'Comunidade OpenSquad', sales: 78, buyers: 71, gross: 6_500, fees: 650, netAfterFees: 5_850, netShare: 0.137 },
      { key: 'p4', name: 'Aula especial', sales: 32, buyers: 31, gross: 2_342.41, fees: 316.19, netAfterFees: 2_026.22, netShare: 0.047 },
    ],
    statusBreakdown: [
      { status: 'approved', count: 483 },
      { status: 'canceled', count: 59 },
      { status: 'refunded', count: 14 },
    ],
    insights: [
      { code: 'top_product', title: 'Produto líder', body: 'Ecossistema Cognitivo respondeu por 54,4% do líquido após taxas no período.', tone: 'positive' },
      { code: 'best_day', title: 'Melhor dia', body: '13/07 registrou R$ 4.304,00 após taxas em 30 vendas.', tone: 'neutral' },
      { code: 'refund_rate', title: 'Reembolsos', body: '14 reembolsos, equivalentes a 2,8% das vendas aprovadas mais reembolsadas.', tone: 'neutral' },
      { code: 'goal_pace', title: 'Ritmo para a meta', body: 'Faltam R$ 7.173,78; o ritmo necessário é R$ 377,57 por dia.', tone: 'neutral' },
    ],
    warnings: [],
    updatedAt: now.toISOString(),
  },
};

const qualityFixture = {
  ok: true,
  member: { role: 'admin' },
  quality: {
    generatedAt: now.toISOString(), overallStatus: 'healthy',
    coverage: { requestedStart: monthStart, requestedEnd: localDate, youtubeDatesPresent: 13, youtubeMissingDates: [] },
    configuration: { database: true, hotmartWebhook: true, buyerHmac: true },
    sources: [
      { source: 'youtube', label: 'YouTube Analytics', status: 'healthy', lastSyncAt: now.toISOString(), sourceWatermark: localDate, ageHours: 0.2, rowsRead: 800, rowsWritten: 800, rowsSkipped: 0, repairs: 0, warnings: [], errorCode: null, errorMessage: null },
      { source: 'hotmart_webhook', label: 'Webhook Hotmart', status: 'healthy', lastSyncAt: now.toISOString(), sourceWatermark: localDate, ageHours: 0.2, rowsRead: 1, rowsWritten: 1, rowsSkipped: 0, repairs: 0, warnings: [], errorCode: null, errorMessage: null },
      { source: 'hotmart_reconciliation', label: 'Reconciliação Hotmart', status: 'healthy', lastSyncAt: now.toISOString(), sourceWatermark: localDate, ageHours: 0.2, rowsRead: 556, rowsWritten: 3, rowsSkipped: 553, repairs: 0, warnings: [], errorCode: null, errorMessage: null },
    ],
    alerts: [],
  },
};

const session = {
  access_token: 'fixture-access-token',
  token_type: 'bearer',
  expires_in: 86_400,
  expires_at: Math.floor(Date.now() / 1000) + 86_400,
  refresh_token: 'fixture-refresh-token',
  user: {
    id: 'fixture-user', aud: 'authenticated', role: 'authenticated', email: 'contact@brunosalles.com',
    email_confirmed_at: now.toISOString(), phone: '', confirmation_sent_at: null,
    confirmed_at: now.toISOString(), last_sign_in_at: now.toISOString(), app_metadata: {}, user_metadata: {},
    identities: [], created_at: now.toISOString(), updated_at: now.toISOString(), is_anonymous: false,
  },
};

async function prepare(page: Page) {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, JSON.stringify(value)), [storageKey, session] as const);
  await page.route('**/functions/v1/ci-overview*', route => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify(overviewFixture),
  }));
  await page.route('**/functions/v1/ci-quality*', route => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify(qualityFixture),
  }));
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.getByText('Líquido após taxas', { exact: true }).first().waitFor();
  await page.waitForTimeout(1_200);
}

const browser = await chromium.launch({ executablePath, headless: true });
try {
  const desktop = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  await prepare(desktop);
  await desktop.getByRole('button', { name: 'Qualidade dos dados' }).click();
  await desktop.getByText('Confiança operacional', { exact: true }).waitFor();
  await desktop.getByRole('button', { name: 'Visão comercial' }).click();
  await desktop.screenshot({ path: path.join(evidence, 'overview-desktop-1366.png'), fullPage: true });
  await desktop.locator('.ci-bottom-grid').scrollIntoViewIfNeeded();
  await desktop.waitForTimeout(250);
  await desktop.locator('.ci-bottom-grid').screenshot({ path: path.join(evidence, 'overview-desktop-lower.png') });

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await prepare(mobile);
  const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 1) throw new Error(`Layout mobile possui overflow horizontal de ${overflow}px.`);
  await mobile.screenshot({ path: path.join(evidence, 'overview-mobile-390.png'), fullPage: true });
  await mobile.locator('.ci-chart-panel').scrollIntoViewIfNeeded();
  await mobile.waitForTimeout(250);
  await mobile.locator('.ci-chart-panel').screenshot({ path: path.join(evidence, 'overview-mobile-chart.png') });
  await mobile.locator('.ci-products-panel').scrollIntoViewIfNeeded();
  await mobile.locator('.ci-products-panel').screenshot({ path: path.join(evidence, 'overview-mobile-products.png') });
  const bottomPanels = mobile.locator('.ci-bottom-grid .ci-panel');
  await bottomPanels.nth(0).scrollIntoViewIfNeeded();
  await bottomPanels.nth(0).screenshot({ path: path.join(evidence, 'overview-mobile-insights.png') });
  await bottomPanels.nth(1).scrollIntoViewIfNeeded();
  await bottomPanels.nth(1).screenshot({ path: path.join(evidence, 'overview-mobile-statuses.png') });

  console.log(JSON.stringify({
    ok: true,
    browser: path.basename(executablePath),
    desktop: 'overview-desktop-1366.png',
    desktopLower: 'overview-desktop-lower.png',
    mobile: 'overview-mobile-390.png',
    mobileSections: [
      'overview-mobile-chart.png',
      'overview-mobile-products.png',
      'overview-mobile-insights.png',
      'overview-mobile-statuses.png',
    ],
    mobileOverflowPx: overflow,
    tabNavigation: true,
  }));
} finally {
  await browser.close();
}
