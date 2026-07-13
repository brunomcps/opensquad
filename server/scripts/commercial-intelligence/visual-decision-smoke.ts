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
const evidence = path.resolve(process.cwd(), 'docs/commercial-intelligence/evidence/campaign-tracking-association');
fs.mkdirSync(evidence, { recursive: true });

const now = new Date('2026-07-13T18:00:00.000Z');
const session = {
  access_token: 'fixture-access-token', token_type: 'bearer', expires_in: 86_400,
  expires_at: Math.floor(Date.now() / 1000) + 86_400, refresh_token: 'fixture-refresh-token',
  user: {
    id: 'fixture-user', aud: 'authenticated', role: 'authenticated', email: 'contact@brunosalles.com',
    email_confirmed_at: now.toISOString(), phone: '', confirmation_sent_at: null, confirmed_at: now.toISOString(),
    last_sign_in_at: now.toISOString(), app_metadata: {}, user_metadata: {}, identities: [],
    created_at: now.toISOString(), updated_at: now.toISOString(), is_anonymous: false,
  },
};

const quality = {
  ok: true, member: { role: 'admin' },
  quality: {
    generatedAt: now.toISOString(), overallStatus: 'healthy',
    coverage: { requestedStart: '2026-06-09', requestedEnd: '2026-07-13', youtubeDatesPresent: 35, youtubeMissingDates: [] },
    configuration: { database: true, hotmartWebhook: true, buyerHmac: true }, sources: [], alerts: [],
  },
};

const overview = {
  ok: true, member: { role: 'admin' }, overview: {
    period: { start: '2026-07-01', end: '2026-07-13', timezone: 'America/Sao_Paulo' }, currency: 'BRL', availableCurrencies: ['BRL'],
    totals: { gross: 15333.03, fees: 1589.97, netAfterFees: 13743.06, sales: 139, buyers: 90, averageTicket: 98.87, refunds: 2, refundGross: 198, chargebacks: 0, chargebackGross: 0, cancellations: 9 },
    goal: { value: 50000, progress: 0.2749, remaining: 36256.94, requiredDailyPace: 1908.26, daysRemaining: 19 },
    daily: [{ date: '2026-07-12', gross: 1100, fees: 110, netAfterFees: 990, sales: 10 }, { date: '2026-07-13', gross: 1800, fees: 180, netAfterFees: 1620, sales: 16 }],
    products: [{ key: 'p1', name: 'Ecossistema Cognitivo', sales: 139, buyers: 90, gross: 15333.03, fees: 1589.97, netAfterFees: 13743.06, netShare: 1 }],
    statusBreakdown: [{ status: 'approved', count: 139 }], insights: [], warnings: [], updatedAt: now.toISOString(),
  },
};

const campaigns = {
  ok: true, member: { role: 'admin' },
  catalog: {
    videos: [
      { video_id: 'OHmYcSx33FY', title: 'TDAH em adultos: o erro que quase ninguém percebe', published_at: '2026-07-01T12:00:00Z', content_type: 'long', thumbnail_url: null },
      { video_id: 'abc123', title: 'Ansiedade ou hiperatividade mental?', published_at: '2026-06-18T12:00:00Z', content_type: 'long', thumbnail_url: null },
    ],
    products: [{ productId: 'p1', productName: 'Ecossistema Cognitivo', offerCodes: ['oferta-principal'] }],
  },
  campaigns: [
    {
      campaign_id: 'c1', tracking_code: 'yt|OHmYcSx33FY|d|a1b2', slug: 'ci-abcdef123456', name: 'TDAH — descrição', channel: 'youtube',
      video_id: 'OHmYcSx33FY', product_id: 'p1', product_name: 'Ecossistema Cognitivo', offer_code: 'oferta-principal',
      destination_url: 'https://pay.hotmart.com/X123', tracking_parameter: 'sck', cta_label: 'Conheça o Ecossistema', cta_position: 'description',
      utm_source: 'youtube', utm_medium: 'organic', utm_campaign: 'tdah-descricao', utm_content: 'descricao', utm_term: null,
      status: 'active', starts_at: now.toISOString(), created_at: now.toISOString(), updated_at: now.toISOString(),
      directUrl: 'https://pay.hotmart.com/X123?sck=yt%7COHmYcSx33FY%7Cd%7Ca1b2&utm_source=youtube&utm_medium=organic&utm_campaign=tdah-descricao',
      redirectUrl: 'https://example.supabase.co/functions/v1/ci-campaign-redirect?slug=ci-abcdef123456', humanClicks: 82,
    },
    {
      campaign_id: 'c2', tracking_code: 'yt|abc123|p|c3d4', slug: 'ci-fedcba654321', name: 'Ansiedade — comentário', channel: 'youtube',
      video_id: 'abc123', product_id: 'p1', product_name: 'Ecossistema Cognitivo', offer_code: null,
      destination_url: 'https://pay.hotmart.com/X123', tracking_parameter: 'sck', cta_label: 'Veja a formação', cta_position: 'pinned_comment',
      utm_source: 'youtube', utm_medium: 'organic', utm_campaign: 'ansiedade-comentario', utm_content: 'comentario', utm_term: null,
      status: 'inactive', starts_at: now.toISOString(), created_at: now.toISOString(), updated_at: now.toISOString(),
      directUrl: 'https://pay.hotmart.com/X123?sck=yt%7Cabc123%7Cp%7Cc3d4&utm_source=youtube&utm_medium=organic&utm_campaign=ansiedade-comentario',
      redirectUrl: 'https://example.supabase.co/functions/v1/ci-campaign-redirect?slug=ci-fedcba654321', humanClicks: 34,
    },
  ],
};

const attribution = {
  ok: true, member: { role: 'admin' }, attribution: {
    period: { start: '2026-01-14', end: '2026-07-13' }, currency: 'BRL',
    totals: { approvedSales: 483, trackedOriginSales: 12, attributedSales: 10, unattributedSales: 473, ambiguousOriginSales: 0, attributedNetAfterFees: 1134.5, coverage: 0.0207, humanClicks: 116 },
    campaigns: [
      { campaignId: 'c1', campaignName: 'TDAH — descrição', trackingCode: 'yt|OHmYcSx33FY|d|a1b2', videoId: 'OHmYcSx33FY', productName: 'Ecossistema Cognitivo', ctaLabel: 'Conheça o Ecossistema', ctaPosition: 'description', clicks: 82, sales: 8, netAfterFees: 932.5, clickToSale: 0.0976 },
      { campaignId: 'c2', campaignName: 'Ansiedade — comentário', trackingCode: 'yt|abc123|p|c3d4', videoId: 'abc123', productName: 'Ecossistema Cognitivo', ctaLabel: 'Veja a formação', ctaPosition: 'pinned_comment', clicks: 34, sales: 2, netAfterFees: 202, clickToSale: 0.0588 },
    ],
    unknownCodes: [{ code: 'legado-externo', sales: 2, netAfterFees: 180 }],
  },
};

const association = {
  ok: true, member: { role: 'admin' }, association: {
    period: { start: '2026-01-14', end: '2026-07-13', currency: 'BRL' },
    method: { label: 'Associação temporal exploratória', postWindowDays: 7, baselineWeeks: 4, description: 'A janela posterior de 7 dias é comparada aos mesmos dias da semana nas 4 semanas anteriores.', warning: 'Diferença observada não prova que o vídeo causou as vendas.' },
    totals: { videosPublished: 12, videosAnalyzed: 9, aboveBaseline: 5, belowBaseline: 4, insufficientData: 3 },
    videos: [
      { videoId: 'OHmYcSx33FY', title: 'TDAH em adultos: o erro que quase ninguém percebe', publishedDate: '2026-07-01', contentType: 'long', thumbnailUrl: null, postWindow: { start: '2026-07-01', end: '2026-07-07' }, views: 48200, actualSales: 31, expectedSales: 19.5, salesDifference: 11.5, actualNetAfterFees: 3220, expectedNetAfterFees: 1890, netDifference: 1330, netDifferenceRate: 0.7037, overlapCount: 1, signal: 'above', warnings: ['Há outros vídeos publicados na mesma janela; não isole efeito causal.'] },
      { videoId: 'abc123', title: 'Ansiedade ou hiperatividade mental?', publishedDate: '2026-06-18', contentType: 'long', thumbnailUrl: null, postWindow: { start: '2026-06-18', end: '2026-06-24' }, views: 31700, actualSales: 14, expectedSales: 18, salesDifference: -4, actualNetAfterFees: 1310, expectedNetAfterFees: 1740, netDifference: -430, netDifferenceRate: -0.2471, overlapCount: 0, signal: 'below', warnings: [] },
    ],
  },
};

async function prepare(page: Page) {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, JSON.stringify(value)), [storageKey, session] as const);
  await page.route('**/functions/v1/ci-quality*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(quality) }));
  await page.route('**/functions/v1/ci-overview*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(overview) }));
  await page.route('**/functions/v1/ci-campaigns*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(campaigns) }));
  await page.route('**/functions/v1/ci-attribution*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(attribution) }));
  await page.route('**/functions/v1/ci-association*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(association) }));
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Rastreamento' }).waitFor();
}

async function capture(page: Page, prefix: string) {
  await page.getByRole('button', { name: 'Rastreamento' }).click();
  await page.getByText('Campanhas e links', { exact: true }).waitFor();
  await page.screenshot({ path: path.join(evidence, `${prefix}-tracking-top.png`) });
  const campaignPanel = page.locator('.ci-campaign-list').first();
  await campaignPanel.scrollIntoViewIfNeeded();
  await campaignPanel.screenshot({ path: path.join(evidence, `${prefix}-tracking-campaigns.png`) });
  await page.getByRole('button', { name: 'Vídeos × vendas' }).click();
  await page.getByText('Ranking exploratório', { exact: true }).waitFor();
  await page.screenshot({ path: path.join(evidence, `${prefix}-association-top.png`) });
  const associationPanel = page.locator('.ci-association-panel').first();
  await associationPanel.scrollIntoViewIfNeeded();
  await associationPanel.screenshot({ path: path.join(evidence, `${prefix}-association-ranking.png`) });
  const navBox = await page.locator('.ci-main-tabs').boundingBox();
  const visibleTabs = await page.locator('.ci-main-tabs button').evaluateAll(buttons => buttons.filter(button => {
    const rect = button.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }).length);
  return {
    overflow: await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
    navHeight: navBox?.height || 0,
    visibleTabs,
  };
}

const browser = await chromium.launch({ executablePath, headless: true });
try {
  const desktop = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  await prepare(desktop);
  const desktopResult = await capture(desktop, 'desktop-1366');
  if (desktopResult.overflow > 1) throw new Error(`Layout desktop possui overflow horizontal de ${desktopResult.overflow}px.`);
  if (desktopResult.visibleTabs !== 4 || desktopResult.navHeight < 30) throw new Error('Navegação desktop não está totalmente visível.');

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await prepare(mobile);
  const mobileResult = await capture(mobile, 'mobile-390');
  if (mobileResult.overflow > 1) throw new Error(`Layout mobile possui overflow horizontal de ${mobileResult.overflow}px.`);
  if (mobileResult.visibleTabs !== 4 || mobileResult.navHeight < 60) throw new Error('Navegação mobile não está totalmente visível.');

  console.log(JSON.stringify({
    ok: true,
    browser: path.basename(executablePath),
    desktopOverflowPx: desktopResult.overflow,
    mobileOverflowPx: mobileResult.overflow,
    desktopNavHeight: desktopResult.navHeight,
    mobileNavHeight: mobileResult.navHeight,
    visibleTabs: mobileResult.visibleTabs,
    screenshots: [
      'desktop-1366-tracking-top.png', 'desktop-1366-tracking-campaigns.png',
      'desktop-1366-association-top.png', 'desktop-1366-association-ranking.png',
      'mobile-390-tracking-top.png', 'mobile-390-tracking-campaigns.png',
      'mobile-390-association-top.png', 'mobile-390-association-ranking.png',
    ],
    directAttributionLabel: true,
    temporalAssociationLabel: true,
    campaignLinks: 2,
    associationRows: 2,
  }));
} finally {
  await browser.close();
}
