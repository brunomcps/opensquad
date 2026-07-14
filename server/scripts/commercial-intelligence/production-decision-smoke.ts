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
  throw new Error('SUPABASE_URL, SUPABASE_KEY, SUPABASE_SERVICE_ROLE_KEY, CI_SMOKE_APP_URL and CI_SMOKE_EMAIL are required.');
}
const targetAppUrl = appUrl;
const publicKey = publishableKey;

const executableCandidates = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean) as string[];
const executablePath = executableCandidates.find(candidate => fs.existsSync(candidate));
if (!executablePath) throw new Error('Chrome or Edge was not found for the production smoke test.');

const functionsUrl = `${supabaseUrl.replace(/\/$/, '')}/functions/v1`;
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
if (verified.error || !verified.data.session) throw verified.error || new Error('Temporary session was not created.');

const session = verified.data.session;
const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
const storageKey = `sb-${projectRef}-auth-token`;
const evidence = path.resolve(process.cwd(), 'docs/commercial-intelligence/evidence/campaign-tracking-association-production');
fs.mkdirSync(evidence, { recursive: true });

async function functionRequest(name: string, init?: RequestInit) {
  const response = await fetch(`${functionsUrl}/${name}`, {
    ...init,
    headers: {
      apikey: publicKey,
      authorization: `Bearer ${session.access_token}`,
      ...(init?.headers || {}),
    },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`${name} returned ${response.status}: ${JSON.stringify(body)}`);
  return body;
}

async function prepare(page: Page) {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, JSON.stringify(value)), [storageKey, session] as const);
  await page.goto(targetAppUrl, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Rastreamento' }).waitFor({ timeout: 30_000 });
}

async function capture(page: Page, prefix: string, campaignName: string) {
  await page.getByRole('button', { name: 'Rastreamento' }).click();
  await page.getByText('Campanhas e links', { exact: true }).waitFor({ timeout: 30_000 });
  await page.getByText(campaignName, { exact: true }).waitFor({ timeout: 30_000 });
  await page.screenshot({ path: path.join(evidence, `${prefix}-tracking-top.png`), fullPage: true });

  const campaignPanel = page.locator('.ci-campaign-list').first();
  await campaignPanel.scrollIntoViewIfNeeded();
  await campaignPanel.screenshot({ path: path.join(evidence, `${prefix}-tracking-campaigns.png`) });
  const selectedProductLabel = await page.locator('.ci-campaign-form select').nth(1).locator('option:checked').textContent();

  await page.getByRole('button', { name: 'Vídeos × vendas' }).click();
  await page.getByText('Associação temporal exploratória', { exact: true }).waitFor({ timeout: 30_000 });
  await page.locator('.ci-kpi-grid').first().waitFor({ timeout: 30_000 });
  await page.screenshot({ path: path.join(evidence, `${prefix}-association-top.png`), fullPage: true });

  const associationPanel = page.locator('.ci-association-panel').first();
  const emptyPanel = page.locator('.ci-empty-action').first();
  const resultPanel = (await associationPanel.count()) ? associationPanel : emptyPanel;
  await resultPanel.scrollIntoViewIfNeeded();
  await resultPanel.screenshot({ path: path.join(evidence, `${prefix}-association-result.png`) });

  const navBox = await page.locator('.ci-main-tabs').boundingBox();
  const visibleTabs = await page.locator('.ci-main-tabs button').evaluateAll(buttons => buttons.filter(button => {
    const rect = button.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }).length);
  return {
    overflow: await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
    navHeight: navBox?.height || 0,
    visibleTabs,
    associationRows: await page.locator('.ci-association-table tbody tr').count(),
    selectedProductLabel,
  };
}

let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;
let campaignId: string | null = null;
let report: Record<string, unknown> | null = null;
let cleanupError: Error | null = null;
try {
  const unauthCampaigns = await fetch(`${functionsUrl}/ci-campaigns`);
  if (unauthCampaigns.status !== 401) throw new Error(`Unauthenticated campaigns control returned ${unauthCampaigns.status}, expected 401.`);
  const missingRedirect = await fetch(`${functionsUrl}/ci-campaign-redirect`, { redirect: 'manual' });
  if (missingRedirect.status !== 404) throw new Error(`Missing campaign redirect returned ${missingRedirect.status}, expected 404.`);

  const initialCampaigns = await functionRequest('ci-campaigns');
  const video = initialCampaigns.catalog?.videos?.[0];
  const product = initialCampaigns.catalog?.products?.[0];
  if (!video || !product) throw new Error('Production catalog must contain at least one synchronized video and one Hotmart product.');

  const stamp = Date.now();
  const campaignName = `Smoke E2E ${stamp}`;
  const created = await functionRequest('ci-campaigns', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: campaignName,
      videoId: video.video_id,
      productId: product.productId,
      productName: product.productName,
      offerCode: product.offerCodes?.[0] || null,
      destinationUrl: 'https://example.com/opensquad-ci-smoke',
      trackingParameter: 'sck',
      ctaLabel: 'Smoke E2E',
      ctaPosition: 'other',
      utmSource: 'youtube',
      utmMedium: 'smoke',
      utmCampaign: 'ci-smoke',
      utmContent: 'production-e2e',
      utmTerm: null,
      startsAt: new Date(Date.now() - 60_000).toISOString(),
      status: 'active',
    }),
  });
  campaignId = created.campaign?.campaign_id;
  const redirectUrl = created.campaign?.redirectUrl;
  if (!campaignId || !redirectUrl) throw new Error('Created campaign did not return campaign_id and redirectUrl.');

  const redirect = await fetch(redirectUrl, {
    redirect: 'manual',
    headers: { 'user-agent': 'Mozilla/5.0 CIProductionSmoke/1.0', referer: targetAppUrl },
  });
  if (redirect.status !== 302) throw new Error(`Campaign redirect returned ${redirect.status}, expected 302.`);
  const location = redirect.headers.get('location');
  if (!location) throw new Error('Campaign redirect did not return a location header.');
  const destination = new URL(location);
  if (!destination.searchParams.get('sck') || destination.searchParams.get('utm_campaign') !== 'ci-smoke') {
    throw new Error('Campaign redirect did not preserve tracking and UTM parameters.');
  }

  const afterClick = await functionRequest('ci-campaigns');
  const smokeCampaign = afterClick.campaigns?.find((campaign: any) => campaign.campaign_id === campaignId);
  if (!smokeCampaign || smokeCampaign.humanClicks < 1) throw new Error('The redirect click was not recorded as a human click.');

  const today = new Date().toISOString().slice(0, 10);
  const attribution = await functionRequest(`ci-attribution?start=2026-01-01&end=${today}&currency=BRL`);
  const attributedCampaign = attribution.attribution?.campaigns?.find((campaign: any) => campaign.campaignId === campaignId);
  if (!attributedCampaign || attributedCampaign.clicks < 1) throw new Error('The campaign click was not exposed by direct attribution.');

  const associationStart = new Date(Date.now() - 180 * 86_400_000).toISOString().slice(0, 10);
  const association = await functionRequest(`ci-association?start=${associationStart}&end=${today}&currency=BRL&window=7&baselineWeeks=2`);
  if (association.association?.method?.label !== 'Associação temporal exploratória') {
    throw new Error('The temporal association endpoint did not return the expected method label.');
  }
  if (association.association?.method?.baselineWeeks !== 2 || association.association?.videos?.length < 1) {
    throw new Error('The two-week baseline did not produce an analyzable production association.');
  }

  browser = await chromium.launch({ executablePath, headless: true });
  const desktop = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  await prepare(desktop);
  const desktopResult = await capture(desktop, 'production-desktop-1366', campaignName);
  if (desktopResult.overflow > 1 || desktopResult.visibleTabs !== 4) throw new Error('Production desktop navigation or horizontal layout failed.');
  if (desktopResult.selectedProductLabel?.includes('&amp;')) throw new Error('Production desktop still exposes an encoded HTML entity in the product label.');

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await prepare(mobile);
  const mobileResult = await capture(mobile, 'production-mobile-390', campaignName);
  if (mobileResult.overflow > 1 || mobileResult.visibleTabs !== 4) throw new Error('Production mobile navigation or horizontal layout failed.');

  report = {
    ok: true,
    appStatus: 'authenticated',
    memberRole: initialCampaigns.member?.role,
    catalogVideos: initialCampaigns.catalog.videos.length,
    catalogProducts: initialCampaigns.catalog.products.length,
    initialCampaigns: initialCampaigns.campaigns.length,
    redirectStatus: redirect.status,
    humanClicks: smokeCampaign.humanClicks,
    attributedClicks: attributedCampaign.clicks,
    attributedSales: attributedCampaign.sales,
    attributionCoverage: attribution.attribution?.totals?.coverage,
    associationVideosPublished: association.association?.totals?.videosPublished,
    associationVideosAnalyzed: association.association?.totals?.videosAnalyzed,
    associationRows: association.association?.videos?.length,
    desktopOverflowPx: desktopResult.overflow,
    mobileOverflowPx: mobileResult.overflow,
    desktopNavHeight: desktopResult.navHeight,
    mobileNavHeight: mobileResult.navHeight,
    visibleTabs: mobileResult.visibleTabs,
    productLabelDecoded: !desktopResult.selectedProductLabel?.includes('&amp;'),
    unauthenticatedCampaignsStatus: unauthCampaigns.status,
    missingRedirectStatus: missingRedirect.status,
  };
} finally {
  if (browser) await browser.close();
  if (campaignId) {
    const clickCleanup = await admin.from('ci_click_events').delete().eq('campaign_id', campaignId);
    const campaignCleanup = await admin.from('ci_campaigns').delete().eq('campaign_id', campaignId);
    if (clickCleanup.error || campaignCleanup.error) {
      cleanupError = new Error(`Cleanup failed: ${clickCleanup.error?.message || campaignCleanup.error?.message}`);
    } else {
      const remaining = await admin.from('ci_campaigns').select('campaign_id', { count: 'exact', head: true }).eq('campaign_id', campaignId);
      if (remaining.error || remaining.count !== 0) cleanupError = new Error('Temporary campaign still exists after cleanup.');
    }
  }
  const signedOut = await anon.auth.signOut({ scope: 'local' });
  if (signedOut.error && !cleanupError) cleanupError = signedOut.error;
}

if (cleanupError) throw cleanupError;
console.log(JSON.stringify({ ...report, temporaryDataRemoved: true, sessionRevoked: true }));
