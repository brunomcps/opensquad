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
const thumbnailDataUrl = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"%3E%3Crect width="1280" height="720" fill="%2323262b"/%3E%3Crect x="48" y="48" width="1184" height="624" rx="28" fill="%23f0ba3c"/%3E%3Ctext x="640" y="330" fill="%231a1a1a" font-family="Arial" font-size="72" font-weight="700" text-anchor="middle"%3EO QUE REALMENTE É TDAH%3C/text%3E%3Ctext x="640" y="415" fill="%231a1a1a" font-family="Arial" font-size="38" text-anchor="middle"%3EMiniatura controlada para smoke%3C/text%3E%3C/svg%3E';
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
      { video_id: '0OkxYzoxzUk', title: 'O QUE REALMENTE É TDAH (Não é uma doença)', published_at: '2026-07-01T12:00:00Z', content_type: 'long', thumbnail_url: thumbnailDataUrl },
      { video_id: 'abc123', title: 'Vídeo com prévia indisponível', published_at: '2026-06-18T12:00:00Z', content_type: 'long', thumbnail_url: null },
    ],
    products: [{ productId: '6966825', productName: 'MAPA-7P · Mapeamento de Padrões Dopaminérgico', offerCodes: ['vyqym0gx'] }],
  },
  campaigns: [
    {
      campaign_id: 'c1', tracking_code: 'yt|0OkxYzoxzUk|d|165e', slug: '0okxyzoxzuk-d', name: 'MAPA-7P piloto | 0OkxYzoxzUk | description', channel: 'youtube',
      video_id: '0OkxYzoxzUk', product_id: '6966825', product_name: 'MAPA-7P · Mapeamento de Padrões Dopaminérgico', offer_code: 'vyqym0gx',
      destination_url: 'https://go.hotmart.com/K103806991N', tracking_parameter: 'src', cta_label: 'Conheça o MAPA-7P', cta_position: 'description',
      utm_source: 'youtube', utm_medium: 'organic', utm_campaign: 'mapa7p-youtube', utm_content: 'description', utm_term: null,
      status: 'active', starts_at: now.toISOString(), created_at: now.toISOString(), updated_at: now.toISOString(),
      directUrl: 'https://go.hotmart.com/K103806991N?src=yt%7C0OkxYzoxzUk%7Cd%7C165e&utm_source=youtube&utm_medium=organic&utm_campaign=mapa7p-youtube&utm_content=description',
      redirectUrl: 'https://link.brunosallesphd.com.br/m7p/0okxyzoxzuk-d', humanClicks: 82,
    },
    {
      campaign_id: 'c2', tracking_code: 'yt|0OkxYzoxzUk|p|174e', slug: '0okxyzoxzuk-c', name: 'MAPA-7P piloto | 0OkxYzoxzUk | pinned_comment', channel: 'youtube',
      video_id: '0OkxYzoxzUk', product_id: '6966825', product_name: 'MAPA-7P · Mapeamento de Padrões Dopaminérgico', offer_code: 'vyqym0gx',
      destination_url: 'https://go.hotmart.com/K103806991N', tracking_parameter: 'src', cta_label: 'Conheça o MAPA-7P', cta_position: 'pinned_comment',
      utm_source: 'youtube', utm_medium: 'organic', utm_campaign: 'mapa7p-youtube', utm_content: 'pinned_comment', utm_term: null,
      status: 'inactive', starts_at: now.toISOString(), created_at: now.toISOString(), updated_at: now.toISOString(),
      directUrl: 'https://go.hotmart.com/K103806991N?src=yt%7C0OkxYzoxzUk%7Cp%7C174e&utm_source=youtube&utm_medium=organic&utm_campaign=mapa7p-youtube&utm_content=pinned_comment',
      redirectUrl: 'https://link.brunosallesphd.com.br/m7p/0okxyzoxzuk-c', humanClicks: 34,
    },
    {
      campaign_id: 'c3', tracking_code: 'yt|0OkxYzoxzUk|r|5eff', slug: '0okxyzoxzuk-r', name: 'MAPA-7P piloto | 0OkxYzoxzUk | comment_reply', channel: 'youtube',
      video_id: '0OkxYzoxzUk', product_id: '6966825', product_name: 'MAPA-7P · Mapeamento de Padrões Dopaminérgico', offer_code: 'vyqym0gx',
      destination_url: 'https://go.hotmart.com/K103806991N', tracking_parameter: 'src', cta_label: 'Conheça o MAPA-7P', cta_position: 'comment_reply',
      utm_source: 'youtube', utm_medium: 'organic', utm_campaign: 'mapa7p-youtube', utm_content: 'comment_reply', utm_term: null,
      status: 'active', starts_at: now.toISOString(), created_at: now.toISOString(), updated_at: now.toISOString(),
      directUrl: 'https://go.hotmart.com/K103806991N?src=yt%7C0OkxYzoxzUk%7Cr%7C5eff&utm_source=youtube&utm_medium=organic&utm_campaign=mapa7p-youtube&utm_content=comment_reply',
      redirectUrl: 'https://link.brunosallesphd.com.br/m7p/0okxyzoxzuk-r', humanClicks: 12,
    },
    {
      campaign_id: 'c4', tracking_code: 'yt|abc123|d|ffff', slug: 'fallback-d', name: 'Campanha com metadado incompleto', channel: 'youtube',
      video_id: 'abc123', product_id: '6966825', product_name: 'MAPA-7P · Mapeamento de Padrões Dopaminérgico', offer_code: null,
      destination_url: 'https://go.hotmart.com/K103806991N', tracking_parameter: 'src', cta_label: 'Conheça o MAPA-7P', cta_position: 'description',
      utm_source: 'youtube', utm_medium: 'organic', utm_campaign: 'mapa7p-youtube', utm_content: 'description', utm_term: null,
      status: 'active', starts_at: now.toISOString(), created_at: now.toISOString(), updated_at: now.toISOString(),
      directUrl: 'https://go.hotmart.com/K103806991N?src=yt%7Cabc123%7Cd%7Cffff',
      redirectUrl: 'https://link.brunosallesphd.com.br/m7p/fallback-d', humanClicks: 3,
    },
  ],
};

const attribution = {
  ok: true, member: { role: 'admin' }, attribution: {
    period: { start: '2026-01-14', end: '2026-07-13' }, currency: 'BRL',
    totals: { approvedSales: 483, trackedOriginSales: 14, attributedSales: 12, unattributedSales: 471, ambiguousOriginSales: 0, attributedNetAfterFees: 1354.5, coverage: 0.0248, humanClicks: 131 },
    campaigns: [
      { campaignId: 'c1', campaignName: 'Descrição', trackingCode: 'yt|0OkxYzoxzUk|d|165e', videoId: '0OkxYzoxzUk', productName: 'MAPA-7P', ctaLabel: 'Conheça o MAPA-7P', ctaPosition: 'description', clicks: 82, sales: 8, netAfterFees: 932.5, clickToSale: 0.0976 },
      { campaignId: 'c2', campaignName: 'Comentário', trackingCode: 'yt|0OkxYzoxzUk|p|174e', videoId: '0OkxYzoxzUk', productName: 'MAPA-7P', ctaLabel: 'Conheça o MAPA-7P', ctaPosition: 'pinned_comment', clicks: 34, sales: 2, netAfterFees: 202, clickToSale: 0.0588 },
      { campaignId: 'c3', campaignName: 'Resposta', trackingCode: 'yt|0OkxYzoxzUk|r|5eff', videoId: '0OkxYzoxzUk', productName: 'MAPA-7P', ctaLabel: 'Conheça o MAPA-7P', ctaPosition: 'comment_reply', clicks: 12, sales: 1, netAfterFees: 110, clickToSale: 0.0833 },
      { campaignId: 'c4', campaignName: 'Fallback', trackingCode: 'yt|abc123|d|ffff', videoId: 'abc123', productName: 'MAPA-7P', ctaLabel: 'Conheça o MAPA-7P', ctaPosition: 'description', clicks: 3, sales: 1, netAfterFees: 110, clickToSale: 0.3333 },
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
  await page.route('https://www.youtube-nocookie.com/embed/**', route => route.fulfill({
    status: 200,
    contentType: 'text/html',
    body: '<!doctype html><html><body style="margin:0;background:#111;color:#fff;display:grid;place-items:center;height:100vh;font-family:Arial">Player controlado pelo smoke</body></html>',
  }));
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
  const bundleCount = await campaignPanel.locator('.ci-video-bundle').count();
  if (bundleCount !== 2) throw new Error(`Rastreamento exibiu ${bundleCount} conjuntos de vídeo, esperado 2.`);
  const firstBundle = campaignPanel.locator('[data-video-id="0OkxYzoxzUk"]');
  const positionCount = await firstBundle.locator('.ci-position-row').count();
  if (positionCount !== 3) throw new Error(`Vídeo piloto exibiu ${positionCount} posições, esperado 3.`);
  const positionCodes = await firstBundle.locator('.ci-position-code').allTextContents();
  if (positionCodes.join(',') !== 'D,C,R') throw new Error(`Ordem das posições ficou ${positionCodes.join(',')}, esperado D,C,R.`);
  if (await firstBundle.locator('iframe').count()) throw new Error('Player foi carregado antes da interação explícita.');
  const details = firstBundle.locator('.ci-bundle-details');
  if (await details.evaluate(element => (element as HTMLDetailsElement).open)) throw new Error('Detalhes técnicos começaram abertos.');
  await campaignPanel.getByText('Prévia indisponível', { exact: true }).waitFor();
  await campaignPanel.scrollIntoViewIfNeeded();
  await firstBundle.screenshot({ path: path.join(evidence, `${prefix}-tracking-campaigns.png`) });

  const descriptionCopy = firstBundle.locator('[data-position="description"] .ci-copy-button');
  await descriptionCopy.focus();
  await descriptionCopy.press('Enter');
  await firstBundle.getByText('Copiado', { exact: true }).waitFor();
  const copiedLink = await page.evaluate(() => navigator.clipboard.readText());
  if (copiedLink !== 'https://link.brunosallesphd.com.br/m7p/0okxyzoxzuk-d') throw new Error(`Clipboard recebeu link incorreto: ${copiedLink}`);

  const playButton = firstBundle.getByRole('button', { name: 'Reproduzir O QUE REALMENTE É TDAH (Não é uma doença)' });
  await playButton.focus();
  await playButton.press('Enter');
  const iframe = firstBundle.locator('iframe');
  await iframe.waitFor();
  const iframeSource = await iframe.getAttribute('src');
  if (iframeSource !== 'https://www.youtube-nocookie.com/embed/0OkxYzoxzUk?autoplay=1') throw new Error(`Embed inesperado: ${iframeSource}`);
  await firstBundle.screenshot({ path: path.join(evidence, `${prefix}-tracking-player.png`) });
  const collapseButton = firstBundle.getByRole('button', { name: 'Recolher vídeo' });
  await collapseButton.focus();
  await collapseButton.press('Enter');
  await iframe.waitFor({ state: 'detached' });

  const summary = details.locator('summary');
  await summary.focus();
  await summary.press('Enter');
  if (!(await details.evaluate(element => (element as HTMLDetailsElement).open))) throw new Error('Detalhes técnicos não abriram pelo teclado.');
  const adminActions = await details.getByRole('button', { name: /campanha$/ }).count();
  if (adminActions !== 3) throw new Error(`Detalhes exibiram ${adminActions} ações administrativas, esperado 3.`);
  await firstBundle.screenshot({ path: path.join(evidence, `${prefix}-tracking-details.png`) });

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
    bundleCount,
    positionCount,
    copiedLink,
    iframeSource,
  };
}

const browser = await chromium.launch({ executablePath, headless: true });
try {
  const desktopContext = await browser.newContext({ viewport: { width: 1366, height: 768 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const desktop = await desktopContext.newPage();
  await prepare(desktop);
  const desktopResult = await capture(desktop, 'desktop-1366');
  if (desktopResult.overflow > 1) throw new Error(`Layout desktop possui overflow horizontal de ${desktopResult.overflow}px.`);
  if (desktopResult.visibleTabs !== 4 || desktopResult.navHeight < 30) throw new Error('Navegação desktop não está totalmente visível.');
  await desktopContext.close();

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const mobile = await mobileContext.newPage();
  await prepare(mobile);
  const mobileResult = await capture(mobile, 'mobile-390');
  if (mobileResult.overflow > 1) throw new Error(`Layout mobile possui overflow horizontal de ${mobileResult.overflow}px.`);
  if (mobileResult.visibleTabs !== 4 || mobileResult.navHeight < 60) throw new Error('Navegação mobile não está totalmente visível.');
  await mobileContext.close();

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
      'desktop-1366-tracking-player.png', 'desktop-1366-tracking-details.png',
      'desktop-1366-association-top.png', 'desktop-1366-association-ranking.png',
      'mobile-390-tracking-top.png', 'mobile-390-tracking-campaigns.png',
      'mobile-390-tracking-player.png', 'mobile-390-tracking-details.png',
      'mobile-390-association-top.png', 'mobile-390-association-ranking.png',
    ],
    directAttributionLabel: true,
    temporalAssociationLabel: true,
    videoBundles: desktopResult.bundleCount,
    pilotPositions: desktopResult.positionCount,
    copiedLink: desktopResult.copiedLink,
    iframeSource: desktopResult.iframeSource,
    campaignLinks: 4,
    associationRows: 2,
  }));
} finally {
  await browser.close();
}
