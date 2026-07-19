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
const trackingEvidence = path.resolve(process.cwd(), 'docs/commercial-intelligence/evidence/tracking-control');
fs.mkdirSync(evidence, { recursive: true });
fs.mkdirSync(trackingEvidence, { recursive: true });

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
      campaign_id: 'c5', tracking_code: 'yt|0OkxYzoxzUk|v|c4rd', slug: '0okxyzoxzuk-v', name: 'MAPA-7P piloto | 0OkxYzoxzUk | video', channel: 'youtube',
      video_id: '0OkxYzoxzUk', product_id: '6966825', product_name: 'MAPA-7P · Mapeamento de Padrões Dopaminérgico', offer_code: 'vyqym0gx',
      destination_url: 'https://go.hotmart.com/K103806991N', tracking_parameter: 'src', cta_label: 'Conheça o MAPA-7P', cta_position: 'video',
      utm_source: 'youtube', utm_medium: 'organic', utm_campaign: 'mapa7p-youtube', utm_content: '0OkxYzoxzUk-video', utm_term: null,
      status: 'active', starts_at: now.toISOString(), created_at: now.toISOString(), updated_at: now.toISOString(),
      directUrl: 'https://go.hotmart.com/K103806991N?src=yt%7C0OkxYzoxzUk%7Cv%7Cc4rd&utm_source=youtube&utm_medium=organic&utm_campaign=mapa7p-youtube&utm_content=0OkxYzoxzUk-video',
      redirectUrl: 'https://link.brunosallesphd.com.br/m7p/0okxyzoxzuk-v', humanClicks: 7,
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
    totals: { approvedSales: 483, trackedOriginSales: 15, attributedSales: 13, additionalProductSales: 2, unattributedSales: 470, ambiguousOriginSales: 0, financialDataIncompleteSales: 0, additionalFinancialDataIncompleteSales: 0, attributedNetAfterFees: 1464.5, attributedAdditionalNetAfterFees: 67.5, attributedOrderNetAfterFees: 1532, coverage: 0.0269, humanClicks: 138 },
    campaigns: [
      { campaignId: 'c1', campaignName: 'Descrição', trackingCode: 'yt|0OkxYzoxzUk|d|165e', videoId: '0OkxYzoxzUk', productName: 'MAPA-7P', ctaLabel: 'Conheça o MAPA-7P', ctaPosition: 'description', clicks: 82, sales: 8, additionalSales: 1, financialDataIncompleteSales: 0, additionalFinancialDataIncompleteSales: 0, netAfterFees: 932.5, additionalNetAfterFees: 28.5, orderNetAfterFees: 961, clickToSale: 0.0976 },
      { campaignId: 'c2', campaignName: 'Comentário', trackingCode: 'yt|0OkxYzoxzUk|p|174e', videoId: '0OkxYzoxzUk', productName: 'MAPA-7P', ctaLabel: 'Conheça o MAPA-7P', ctaPosition: 'pinned_comment', clicks: 34, sales: 2, additionalSales: 0, financialDataIncompleteSales: 0, additionalFinancialDataIncompleteSales: 0, netAfterFees: 202, additionalNetAfterFees: 0, orderNetAfterFees: 202, clickToSale: 0.0588 },
      { campaignId: 'c3', campaignName: 'Resposta', trackingCode: 'yt|0OkxYzoxzUk|r|5eff', videoId: '0OkxYzoxzUk', productName: 'MAPA-7P', ctaLabel: 'Conheça o MAPA-7P', ctaPosition: 'comment_reply', clicks: 12, sales: 1, additionalSales: 1, financialDataIncompleteSales: 0, additionalFinancialDataIncompleteSales: 0, netAfterFees: 110, additionalNetAfterFees: 39, orderNetAfterFees: 149, clickToSale: 0.0833 },
      { campaignId: 'c5', campaignName: 'Card do vídeo', trackingCode: 'yt|0OkxYzoxzUk|v|c4rd', videoId: '0OkxYzoxzUk', productName: 'MAPA-7P', ctaLabel: 'Conheça o MAPA-7P', ctaPosition: 'video', clicks: 7, sales: 1, additionalSales: 0, financialDataIncompleteSales: 0, additionalFinancialDataIncompleteSales: 0, netAfterFees: 110, additionalNetAfterFees: 0, orderNetAfterFees: 110, clickToSale: 0.1429 },
      { campaignId: 'c4', campaignName: 'Fallback', trackingCode: 'yt|abc123|d|ffff', videoId: 'abc123', productName: 'MAPA-7P', ctaLabel: 'Conheça o MAPA-7P', ctaPosition: 'description', clicks: 3, sales: 1, additionalSales: 0, financialDataIncompleteSales: 0, additionalFinancialDataIncompleteSales: 0, netAfterFees: 110, additionalNetAfterFees: 0, orderNetAfterFees: 110, clickToSale: 0.3333 },
    ],
    unknownCodes: [{ code: 'legado-externo', sales: 2, netAfterFees: 180 }],
  },
};

const trackingSeries = {
  ok: true,
  member: { role: 'admin' },
  series: {
    period: {
      start: '2026-07-09', end: '2026-07-15',
      startIso: '2026-07-09T03:00:00.000Z', endExclusiveIso: '2026-07-16T03:00:00.000Z',
      timezone: 'America/Sao_Paulo',
    },
    granularity: 'day',
    generatedAt: '2026-07-15T15:00:00.000Z',
    filters: { videoId: null, position: 'all', traffic: 'qualified' },
    freshness: {
      consultedAt: '2026-07-15T15:00:00.000Z',
      lastClickAt: '2026-07-15T14:59:42.000Z',
      lastQualifiedClickAt: '2026-07-15T14:59:42.000Z',
      lastHotmartWebhookAt: '2026-07-15T14:54:10.000Z',
      lastHotmartReconciliationAt: '2026-07-15T09:42:31.000Z',
      lastHotmartReconciliationAttemptAt: '2026-07-15T09:42:31.000Z',
      lastHotmartReconciliationSuccessAt: '2026-07-15T09:42:31.000Z',
      lastHotmartReconciliationPartialAt: null,
      lastHotmartReconciliationStatus: 'success',
      lastHotmartReconciliationWarnings: [],
      lastHotmartReconciliationErrorCode: null,
      lastHotmartReconciliationErrorMessage: null,
      hotmartScheduleActive: true,
      hotmartScheduleExpression: '40 9 * * *',
      nextHotmartReconciliationAt: '2026-07-16T09:40:00.000Z',
      latestOperationalFailureAt: null,
      unresolvedOperationalFailures: 0,
    },
    totals: {
      qualifiedClicks: 9, technicalClicks: 3, unknownClicks: 2, totalClicks: 14, selectedClicks: 9,
      attributedSales: 2, additionalProducts: 1, unattributedSales: 1, ambiguousSales: 0,
      financialDataIncomplete: 0, netAfterFees: 280.9,
    },
    buckets: [
      {
        bucketStart: '2026-07-13T03:00:00.000Z',
        clicks: { description: 2, pinnedComment: 1, commentReply: 0, video: 0, other: 0, total: 3, unknown: 0 },
        sales: { description: 0, pinnedComment: 0, commentReply: 0, video: 0, additional: 0, unattributed: 0, ambiguous: 0, total: 0 },
        financialDataIncomplete: 0,
        netAfterFees: 0,
      },
      {
        bucketStart: '2026-07-14T03:00:00.000Z',
        clicks: { description: 2, pinnedComment: 1, commentReply: 1, video: 1, other: 0, total: 5, unknown: 0 },
        sales: { description: 1, pinnedComment: 0, commentReply: 0, video: 1, additional: 1, unattributed: 0, ambiguous: 0, total: 3 },
        financialDataIncomplete: 0,
        netAfterFees: 201.03,
      },
      {
        bucketStart: '2026-07-15T03:00:00.000Z',
        clicks: { description: 1, pinnedComment: 0, commentReply: 1, video: 0, other: 0, total: 2, unknown: 0 },
        sales: { description: 0, pinnedComment: 1, commentReply: 0, video: 0, additional: 0, unattributed: 1, ambiguous: 0, total: 2 },
        financialDataIncomplete: 0,
        netAfterFees: 79.87,
      },
    ],
  },
};

const trackingEvents = {
  ok: true,
  member: { role: 'admin' },
  timezone: 'America/Sao_Paulo',
  generatedAt: '2026-07-15T15:00:00.000Z',
  events: [
    {
      eventId: 'click:101', type: 'click', occurredAt: '2026-07-15T14:59:42.000Z',
      videoId: '0OkxYzoxzUk', videoTitle: 'O QUE REALMENTE É TDAH (Não é uma doença)', thumbnailUrl: thumbnailDataUrl,
      ctaPosition: 'description', trackingCode: 'yt|0OkxYzoxzUk|d|165e', traffic: 'qualified', trafficGroup: 'qualified',
      referrerHost: 'youtube.com', deviceType: 'mobile', technicalReason: null,
      attribution: null, status: null, amount: null, currency: null, productName: 'MAPA-7P',
    },
    {
      eventId: 'sale:HP-9001', type: 'sale', occurredAt: '2026-07-15T14:54:10.000Z',
      videoId: '0OkxYzoxzUk', videoTitle: 'O QUE REALMENTE É TDAH (Não é uma doença)', thumbnailUrl: thumbnailDataUrl,
      ctaPosition: 'pinned_comment', trackingCode: 'yt|0OkxYzoxzUk|p|174e', traffic: null, trafficGroup: null,
      referrerHost: null, deviceType: null, technicalReason: null,
      attribution: 'direct_primary', status: 'approved', amount: 127.03, currency: 'BRL', productName: 'MAPA-7P',
    },
    {
      eventId: 'click:100', type: 'click', occurredAt: '2026-07-15T14:50:00.000Z',
      videoId: '0OkxYzoxzUk', videoTitle: 'O QUE REALMENTE É TDAH (Não é uma doença)', thumbnailUrl: thumbnailDataUrl,
      ctaPosition: 'pinned_comment', trackingCode: 'yt|0OkxYzoxzUk|p|174e', traffic: 'scanner', trafficGroup: 'technical',
      referrerHost: null, deviceType: 'unknown', technicalReason: 'preview_or_security_scanner',
      attribution: null, status: null, amount: null, currency: null, productName: 'MAPA-7P',
    },
  ],
  nextCursor: null,
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

async function prepare(page: Page, options: { trackingFailure?: boolean } = {}) {
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
  await page.route('**/functions/v1/ci-tracking-series*', route => route.fulfill(options.trackingFailure
    ? { status: 503, contentType: 'application/json', body: JSON.stringify({ error: { code: 'tracking_query_failed', message: 'Falha controlada pelo smoke.' } }) }
    : { status: 200, contentType: 'application/json', body: JSON.stringify(trackingSeries) }));
  await page.route('**/functions/v1/ci-tracking-events*', route => route.fulfill(options.trackingFailure
    ? { status: 503, contentType: 'application/json', body: JSON.stringify({ error: { code: 'tracking_query_failed', message: 'Falha controlada pelo smoke.' } }) }
    : { status: 200, contentType: 'application/json', body: JSON.stringify(trackingEvents) }));
  await page.route('**/functions/v1/ci-association*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(association) }));
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Rastreamento' }).waitFor();
}

async function validateTrackingFailureState(page: Page) {
  await page.getByRole('button', { name: 'Rastreamento' }).click();
  const explorer = page.locator('.ci-tracking-explorer').first();
  await explorer.getByText('Histórico indisponível', { exact: true }).waitFor();
  if (await explorer.locator('.ci-history-kpis').count()) throw new Error('Falha de API exibiu KPIs zerados como se fossem dados reais.');
  if (await explorer.locator('.ci-unified-chart-panel').count()) throw new Error('Falha de API exibiu gráficos vazios como se fossem dados reais.');
  if (await explorer.locator('.ci-event-ledger').count()) throw new Error('Falha de API exibiu livro-caixa vazio como se fosse dado real.');
  const content = await explorer.textContent();
  if (content?.includes('Ainda não registrado')) throw new Error('Falha de API foi confundida com fonte sem atualização registrada.');
}

async function capture(page: Page, prefix: string) {
  await page.getByRole('button', { name: 'Rastreamento' }).click();
  await page.getByText('Campanhas e links', { exact: true }).waitFor();
  const trackingExplorer = page.locator('.ci-tracking-explorer').first();
  await trackingExplorer.getByText('Como os dados chegam', { exact: true }).waitFor();
  await trackingExplorer.getByText('Varredura automática diária às 06:40 BRT e também manual.', { exact: true }).waitFor();
  await trackingExplorer.getByLabel('Tráfego').selectOption('all');
  await trackingExplorer.locator('.ci-history-kpis article').first().locator('strong').getByText('14', { exact: true }).waitFor();
  const dataFlowSteps = await trackingExplorer.locator('.ci-data-flow-guide li').count();
  const trackingKpis = await trackingExplorer.locator('.ci-history-kpis article').count();
  const freshnessFields = await trackingExplorer.locator('.ci-freshness-grid > span').count();
  const ledgerRows = await trackingExplorer.locator('.ci-event-table-desktop tbody tr').count();
  if (dataFlowSteps !== 4) throw new Error(`Fluxo de atualização exibiu ${dataFlowSteps} etapas, esperado 4.`);
  if (trackingKpis !== 5) throw new Error(`Histórico exibiu ${trackingKpis} KPIs, esperado 5.`);
  if (freshnessFields !== 8) throw new Error(`Atualidade exibiu ${freshnessFields} campos, esperado 8.`);
  if (ledgerRows !== 3) throw new Error(`Livro-caixa exibiu ${ledgerRows} eventos, esperado 3.`);
  await trackingExplorer.screenshot({ path: path.join(trackingEvidence, `${prefix}-tracking-control.png`) });
  await trackingExplorer.locator('.ci-unified-chart-panel').screenshot({ path: path.join(trackingEvidence, `${prefix}-tracking-charts.png`) });
  await trackingExplorer.locator('.ci-event-ledger').screenshot({ path: path.join(trackingEvidence, `${prefix}-tracking-ledger.png`) });
  await page.screenshot({ path: path.join(evidence, `${prefix}-tracking-top.png`) });
  const campaignPanel = page.locator('.ci-campaign-list').first();
  const bundleCount = await campaignPanel.locator('.ci-video-bundle').count();
  if (bundleCount !== 2) throw new Error(`Rastreamento exibiu ${bundleCount} conjuntos de vídeo, esperado 2.`);
  const firstBundle = campaignPanel.locator('[data-video-id="0OkxYzoxzUk"]');
  const positionCount = await firstBundle.locator('.ci-position-row').count();
  if (positionCount !== 4) throw new Error(`Vídeo piloto exibiu ${positionCount} posições, esperado 4.`);
  const positionCodes = await firstBundle.locator('.ci-position-code').allTextContents();
  if (positionCodes.join(',') !== 'D,C,R,V') throw new Error(`Ordem das posições ficou ${positionCodes.join(',')}, esperado D,C,R,V.`);
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
  if (adminActions !== 4) throw new Error(`Detalhes exibiram ${adminActions} ações administrativas, esperado 4.`);
  await firstBundle.screenshot({ path: path.join(evidence, `${prefix}-tracking-details.png`) });

  await page.getByRole('button', { name: 'Vídeos × vendas' }).click();
  await page.getByText('Ranking exploratório', { exact: true }).waitFor();
  await page.screenshot({ path: path.join(evidence, `${prefix}-association-top.png`) });
  const associationPanel = page.locator('.ci-association-panel').first();
  await associationPanel.scrollIntoViewIfNeeded();
  await associationPanel.screenshot({ path: path.join(evidence, `${prefix}-association-ranking.png`) });

  await page.getByRole('button', { name: 'Projeções' }).click();
  await page.getByText('Simulador: quanto tempo até a meta').waitFor();
  const projecoesSimples = await page.locator('.ci-proj-cartao').count();
  if (projecoesSimples !== 3) throw new Error(`Projeções (simples) exibiu ${projecoesSimples} cartões de futuro, esperado 3.`);
  await page.screenshot({ path: path.join(evidence, `${prefix}-projecoes-simples.png`), fullPage: true });
  await page.getByRole('button', { name: 'Avançado' }).click();
  await page.getByText('4 · Monte Carlo (2.000 futuros)').waitFor();
  const projecoesMotores = await page.locator('.ci-proj-motor').count();
  if (projecoesMotores !== 4) throw new Error(`Projeções (avançado) exibiu ${projecoesMotores} motores, esperado 4.`);
  await page.screenshot({ path: path.join(evidence, `${prefix}-projecoes-avancado.png`), fullPage: true });
  const blocoMotores = page.locator('.ci-proj-bloco').nth(2);
  await blocoMotores.scrollIntoViewIfNeeded();
  await blocoMotores.screenshot({ path: path.join(evidence, `${prefix}-projecoes-motores.png`) });
  await page.getByRole('button', { name: 'Simples', exact: true }).click();

  await page.getByRole('button', { name: 'Rota 2027' }).click();
  await page.getByText('Playbook 2027', { exact: true }).waitFor();
  const rotaDocumentos = await page.locator('.ci-rota-cartao').count();
  if (rotaDocumentos !== 4) throw new Error(`Rota 2027 exibiu ${rotaDocumentos} documentos, esperado 4.`);
  await page.getByText('Resumo executivo').first().waitFor();
  await page.screenshot({ path: path.join(evidence, `${prefix}-rota-2027.png`) });
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
    dataFlowSteps,
    trackingKpis,
    freshnessFields,
    ledgerRows,
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
  if (desktopResult.visibleTabs !== 6 || desktopResult.navHeight < 30) throw new Error('Navegação desktop não está totalmente visível.');
  await desktopContext.close();

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const mobile = await mobileContext.newPage();
  await prepare(mobile);
  const mobileResult = await capture(mobile, 'mobile-390');
  if (mobileResult.overflow > 1) throw new Error(`Layout mobile possui overflow horizontal de ${mobileResult.overflow}px.`);
  if (mobileResult.visibleTabs !== 6 || mobileResult.navHeight < 60) throw new Error('Navegação mobile não está totalmente visível.');
  await mobileContext.close();

  const failureContext = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  const failurePage = await failureContext.newPage();
  await prepare(failurePage, { trackingFailure: true });
  await validateTrackingFailureState(failurePage);
  await failureContext.close();

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
      'tracking-control/desktop-1366-tracking-control.png',
      'tracking-control/desktop-1366-tracking-charts.png',
      'tracking-control/desktop-1366-tracking-ledger.png',
      'tracking-control/mobile-390-tracking-control.png',
      'tracking-control/mobile-390-tracking-charts.png',
      'tracking-control/mobile-390-tracking-ledger.png',
    ],
    directAttributionLabel: true,
    temporalAssociationLabel: true,
    videoBundles: desktopResult.bundleCount,
    pilotPositions: desktopResult.positionCount,
    trackingDataFlowSteps: desktopResult.dataFlowSteps,
    trackingKpis: desktopResult.trackingKpis,
    trackingFreshnessFields: desktopResult.freshnessFields,
    trackingLedgerRows: desktopResult.ledgerRows,
    trackingFailureState: true,
    copiedLink: desktopResult.copiedLink,
    iframeSource: desktopResult.iframeSource,
    campaignLinks: 4,
    associationRows: 2,
  }));
} finally {
  await browser.close();
}
