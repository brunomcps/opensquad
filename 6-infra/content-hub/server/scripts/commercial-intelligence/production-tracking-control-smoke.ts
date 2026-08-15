import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { chromium, type Page, type Response } from 'playwright-core';

const supabaseUrl = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const appUrl = process.env.CI_SMOKE_APP_URL;
const email = process.env.CI_SMOKE_EMAIL;
if (!supabaseUrl || !publishableKey || !serviceRoleKey || !appUrl || !email) {
  throw new Error('SUPABASE_URL, SUPABASE_KEY, SUPABASE_SERVICE_ROLE_KEY, CI_SMOKE_APP_URL e CI_SMOKE_EMAIL são obrigatórios.');
}
const publicKey: string = publishableKey;
const smokeEmail: string = email;

const targetAppUrl = new URL(appUrl).toString();
const functionsUrl = `${supabaseUrl.replace(/\/$/, '')}/functions/v1`;
const executableCandidates = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean) as string[];
const executablePath = executableCandidates.find(candidate => fs.existsSync(candidate));
if (!executablePath) throw new Error('Chrome ou Edge não encontrado para o smoke de produção.');

const evidenceDirectory = path.resolve(
  process.cwd(),
  'evidence/commercial-intelligence/production-tracking-control',
);
fs.mkdirSync(evidenceDirectory, { recursive: true });
const runStamp = new Date().toISOString().replace(/[:.]/g, '-');

const authOptions = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(supabaseUrl, serviceRoleKey, authOptions);
const anon = createClient(supabaseUrl, publicKey, authOptions);
const generated = await admin.auth.admin.generateLink({
  type: 'magiclink',
  email: smokeEmail,
  options: { redirectTo: targetAppUrl },
});
if (generated.error) throw generated.error;
const verified = await anon.auth.verifyOtp({
  token_hash: generated.data.properties.hashed_token,
  type: 'magiclink',
});
if (verified.error || !verified.data.session) {
  throw verified.error || new Error('A sessão temporária não foi criada.');
}

const session = verified.data.session;
const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
const storageKey = `sb-${projectRef}-auth-token`;

function brtDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function shiftDate(value: string, days: number): string {
  return new Date(Date.parse(`${value}T12:00:00.000Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

async function functionRequest(nameAndQuery: string): Promise<Record<string, unknown>> {
  const response = await fetch(`${functionsUrl}/${nameAndQuery}`, {
    headers: {
      apikey: publicKey,
      authorization: `Bearer ${session.access_token}`,
    },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`${nameAndQuery.split('?')[0]} retornou ${response.status}: ${JSON.stringify(body)}`);
  }
  if (!body || typeof body !== 'object') throw new Error(`${nameAndQuery.split('?')[0]} retornou um corpo inválido.`);
  return body as Record<string, unknown>;
}

const forbiddenResponseKeys = new Set([
  'buyer',
  'buyer_email',
  'buyer_key',
  'buyer_name',
  'customer',
  'customer_email',
  'document',
  'documento',
  'email',
  'ip',
  'ip_address',
  'phone',
  'raw_payload',
  'raw_transaction_id',
  'raw_user_agent',
  'subscription_id',
  'telephone',
  'telefone',
  'transaction_id',
  'user_agent',
]);

function normalizedKey(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

function assertNoPiiOrRawIds(payload: unknown, label: string): void {
  const visit = (value: unknown, trail: string): void => {
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, `${trail}[${index}]`));
      return;
    }
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      const normalized = normalizedKey(key);
      if (forbiddenResponseKeys.has(normalized)) {
        throw new Error(`${label} expôs o campo proibido ${trail}.${key}.`);
      }
      visit(child, `${trail}.${key}`);
    }
  };
  visit(payload, label);

  const serialized = JSON.stringify(payload);
  if (serialized.toLowerCase().includes(smokeEmail.toLowerCase())) {
    throw new Error(`${label} expôs o e-mail usado pelo smoke.`);
  }
  if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(serialized)) {
    throw new Error(`${label} expôs um endereço de e-mail.`);
  }
  if (/\b(?:\d{1,3}\.){3}\d{1,3}\b/.test(serialized)) {
    throw new Error(`${label} expôs um endereço IP.`);
  }
}

function assertOpaqueSaleEventIds(payload: Record<string, unknown>): void {
  const events = Array.isArray(payload.events) ? payload.events : [];
  for (const event of events) {
    if (!event || typeof event !== 'object') continue;
    const row = event as Record<string, unknown>;
    if (row.type === 'sale' && (typeof row.eventId !== 'string' || !/^sale:[a-f0-9]{32}$/.test(row.eventId))) {
      throw new Error('ci-tracking-events expôs um identificador de venda não opaco.');
    }
  }
}

function isTrackingSeriesResponse(response: Response): boolean {
  try {
    return response.ok() && new URL(response.url()).pathname.endsWith('/ci-tracking-series');
  } catch {
    return false;
  }
}

async function injectSession(page: Page): Promise<void> {
  await page.addInitScript(
    ([key, value]) => localStorage.setItem(key, JSON.stringify(value)),
    [storageKey, session] as const,
  );
}

async function openTracking(page: Page): Promise<void> {
  await injectSession(page);
  await page.goto(targetAppUrl, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Rastreamento', exact: true }).waitFor({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Rastreamento', exact: true }).click();
  await page.locator('.ci-tracking-explorer .ci-history-kpis').waitFor({ timeout: 30_000 });
  await page.locator('.ci-tracking-explorer .ci-event-ledger').waitFor({ timeout: 30_000 });
}

type ViewportResult = {
  width: number;
  height: number;
  overflowPx: number;
  dataFlowSteps: number;
  kpis: number;
  freshnessFields: number;
  chartPanels: number;
  hasEventLedger: boolean;
  has0640ScheduleText: boolean;
  screenshot: string;
};

async function validateTrackingViewport(page: Page, width: number, height: number): Promise<ViewportResult> {
  const tracking = page.locator('.ci-tracking-explorer').first();
  const result: ViewportResult = {
    width,
    height,
    overflowPx: await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
    dataFlowSteps: await tracking.locator('.ci-data-flow-guide li').count(),
    kpis: await tracking.locator('.ci-history-kpis > article').count(),
    freshnessFields: await tracking.locator('.ci-freshness-grid > span').count(),
    chartPanels: await tracking.locator('.ci-unified-chart-panel').count(),
    hasEventLedger: await tracking.locator('.ci-event-ledger').isVisible(),
    has0640ScheduleText: await tracking.locator('.ci-data-flow-guide').getByText(/06:40/).isVisible(),
    screenshot: path.join(evidenceDirectory, `${runStamp}-${width}x${height}-tracking.png`),
  };

  if (result.overflowPx > 1) throw new Error(`${width}x${height} possui overflow horizontal de ${result.overflowPx}px.`);
  if (result.dataFlowSteps !== 4) throw new Error(`${width}x${height} exibiu ${result.dataFlowSteps} etapas, esperado: 4.`);
  if (result.kpis !== 5) throw new Error(`${width}x${height} exibiu ${result.kpis} KPIs, esperado: 5.`);
  if (result.freshnessFields !== 8) throw new Error(`${width}x${height} exibiu ${result.freshnessFields} campos de atualidade, esperado: 8.`);
  if (result.chartPanels !== 2) throw new Error(`${width}x${height} exibiu ${result.chartPanels} painéis de gráfico, esperado: 2.`);
  if (!result.hasEventLedger) throw new Error(`${width}x${height} não exibiu o livro-caixa de eventos.`);
  if (!result.has0640ScheduleText) throw new Error(`${width}x${height} não confirmou o texto do agendamento das 06:40.`);

  await tracking.screenshot({ path: result.screenshot, animations: 'disabled' });
  return result;
}

const today = brtDate();
const start = shiftDate(today, -6);
const commonQuery = new URLSearchParams({
  start,
  end: today,
  granularity: 'auto',
  position: 'all',
  traffic: 'qualified',
});

let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;
let report: Record<string, unknown> | null = null;
let operationError: unknown = null;
let signOutError: Error | null = null;
try {
  const seriesPayload = await functionRequest(`ci-tracking-series?${commonQuery.toString()}`);
  const eventsQuery = new URLSearchParams(commonQuery);
  eventsQuery.set('limit', '50');
  const eventsPayload = await functionRequest(`ci-tracking-events?${eventsQuery.toString()}`);
  if (seriesPayload.ok !== true || typeof seriesPayload.series !== 'object') {
    throw new Error('ci-tracking-series não retornou o contrato autenticado esperado.');
  }
  if (eventsPayload.ok !== true || !Array.isArray(eventsPayload.events)) {
    throw new Error('ci-tracking-events não retornou o contrato autenticado esperado.');
  }
  assertNoPiiOrRawIds(seriesPayload, 'ci-tracking-series');
  assertNoPiiOrRawIds(eventsPayload, 'ci-tracking-events');
  assertOpaqueSaleEventIds(eventsPayload);

  browser = await chromium.launch({ executablePath, headless: true });
  const desktop = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const successfulSeriesResponses: number[] = [];
  desktop.on('response', response => {
    if (isTrackingSeriesResponse(response)) successfulSeriesResponses.push(Date.now());
  });
  await openTracking(desktop);
  const desktopResult = await validateTrackingViewport(desktop, 1366, 768);

  const consultedAt = desktop.locator('.ci-freshness-grid > span').first().locator('strong');
  const consultedBefore = await consultedAt.textContent();
  if (!consultedBefore) throw new Error('O carimbo “Dados consultados” não foi exibido antes da atualização manual.');
  await desktop.waitForTimeout(1_100);
  const manualResponse = desktop.waitForResponse(isTrackingSeriesResponse, { timeout: 15_000 });
  await desktop.locator('.ci-tracking-explorer .ci-refresh').click();
  await manualResponse;
  await desktop.waitForFunction(
    ({ selector, before }) => document.querySelector(selector)?.textContent?.trim() !== before.trim(),
    { selector: '.ci-freshness-grid > span:first-child strong', before: consultedBefore },
    { timeout: 15_000 },
  );
  const consultedAfter = await consultedAt.textContent();
  if (!consultedAfter || consultedAfter.trim() === consultedBefore.trim()) {
    throw new Error('O carimbo “Dados consultados” não mudou após “Atualizar painel”.');
  }

  const responsesBeforePoll = successfulSeriesResponses.length;
  const pollStartedAt = Date.now();
  await desktop.waitForResponse(isTrackingSeriesResponse, { timeout: 36_000 });
  const pollingElapsedMs = Date.now() - pollStartedAt;
  if (successfulSeriesResponses.length <= responsesBeforePoll || pollingElapsedMs > 35_500) {
    throw new Error(`Polling automático não foi comprovado dentro de ~35 s (${pollingElapsedMs} ms).`);
  }

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await openTracking(mobile);
  const mobileResult = await validateTrackingViewport(mobile, 390, 844);

  report = {
    ok: true,
    appStatus: 'authenticated',
    endpoints: {
      trackingSeries: 'authenticated-and-private',
      trackingEvents: 'authenticated-and-private',
      eventRowsInspected: (eventsPayload.events as unknown[]).length,
      opaqueSaleEventIds: true,
    },
    desktop: desktopResult,
    mobile: mobileResult,
    manualRefresh: {
      consultedAtChanged: true,
    },
    polling: {
      observed: true,
      elapsedMs: pollingElapsedMs,
      successfulSeriesResponses: successfulSeriesResponses.length,
    },
    commercialDataMutated: false,
  };
} catch (error) {
  operationError = error;
} finally {
  if (browser) await browser.close();
  const signedOut = await anon.auth.signOut({ scope: 'local' });
  if (signedOut.error) signOutError = signedOut.error;
}

if (operationError) throw operationError;
if (signOutError) throw signOutError;
console.log(JSON.stringify({ ...report, temporarySessionDiscardedLocally: true }));
