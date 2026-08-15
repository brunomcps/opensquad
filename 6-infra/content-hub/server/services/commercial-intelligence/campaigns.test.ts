import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildDestinationUrl,
  buildRedirectUrl,
  classifyDevice,
  classifyTraffic,
  generateCampaignSlug,
  generateMapa7pCampaignSlug,
  generateTrackingCode,
  parseCampaignBatchInput,
  parseCampaignInput,
  probableBot,
  referrerHost,
} from '../../../supabase/functions/_shared/campaigns.ts';

test('classifica tráfego qualificado, scanner, técnico e desconhecido com motivo auditável', () => {
  assert.deepEqual(classifyTraffic({ userAgent: 'facebookexternalhit/1.1' }), {
    classification: 'scanner', exclusionReason: 'preview_or_security_scanner', isBot: true,
  });
  assert.deepEqual(classifyTraffic({ userAgent: 'Playwright/1.58 automated check' }), {
    classification: 'bot', exclusionReason: 'automated_user_agent', isBot: true,
  });
  assert.deepEqual(classifyTraffic({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/126.0',
    accept: 'text/html,application/xhtml+xml',
    secFetchMode: 'navigate',
    secFetchDest: 'document',
  }), { classification: 'qualified', exclusionReason: null, isBot: false });
  assert.equal(classifyTraffic({ userAgent: null }).classification, 'unknown');
  assert.equal(classifyTraffic({ userAgent: 'Mozilla/5.0', technical: true }).classification, 'technical');
});

test('gera código compacto aceito pela convenção da Hotmart', () => {
  const code = generateTrackingCode('OHmYcSx33FY', 'description', 'a1b2');
  assert.equal(code, 'yt|OHmYcSx33FY|d|a1b2');
  assert.ok(code.length <= 30);
  assert.doesNotMatch(code, /_/);
  assert.match(code, /^[A-Za-z0-9|]+$/);
  assert.equal(generateTrackingCode('abc-123.DEF', 'comment_reply', 'x-9'), 'yt|abc123DEF|r|x9');
  assert.equal(generateCampaignSlug('A7K3D9QZ-extra'), 'a7k3d9qz');
  assert.match(generateCampaignSlug(), /^[a-z0-9]{8}$/);
  assert.equal(generateMapa7pCampaignSlug('0OkxYzoxzUk', 'description'), '0okxyzoxzuk-d');
  assert.equal(generateMapa7pCampaignSlug('0OkxYzoxzUk', 'pinned_comment'), '0okxyzoxzuk-c');
  assert.equal(generateMapa7pCampaignSlug('0OkxYzoxzUk', 'comment_reply'), '0okxyzoxzuk-r');
  assert.equal(generateMapa7pCampaignSlug('0OkxYzoxzUk', 'video'), '0okxyzoxzuk-v');
  assert.equal(generateTrackingCode('0OkxYzoxzUk', 'video', 'c4rd'), 'yt|0OkxYzoxzUk|v|c4rd');
  assert.throws(() => generateMapa7pCampaignSlug('0OkxYzoxzUk', 'community'), (error: any) => error.code === 'invalid_mapa7p_position');
});

test('gera link público por caminho e preserva fallback com query string', () => {
  assert.equal(
    buildRedirectUrl('https://link.brunosallesphd.com.br/m7p/{slug}', 'a7k3d9qz'),
    'https://link.brunosallesphd.com.br/m7p/a7k3d9qz',
  );
  assert.equal(
    buildRedirectUrl('https://example.supabase.co/functions/v1/ci-campaign-redirect', 'a7k3d9qz'),
    'https://example.supabase.co/functions/v1/ci-campaign-redirect?slug=a7k3d9qz',
  );
});

test('valida lote, remove vídeos duplicados e aceita as quatro posições do MAPA-7P', () => {
  const batch = parseCampaignBatchInput({
    namePrefix: 'MAPA-7P',
    videoIds: ['video1', 'video1', 'video2'],
    productId: '6966825',
    productName: 'MAPA-7P · Mapeamento de Padrões Dopaminérgico',
    offerCode: null,
    destinationUrl: 'https://go.hotmart.com/K103806991N',
    trackingParameter: 'src',
    ctaLabel: 'Conheça o MAPA-7P',
    positions: ['description', 'pinned_comment', 'comment_reply', 'video'],
    utmCampaign: 'mapa7p-youtube',
  });
  assert.deepEqual(batch.videoIds, ['video1', 'video2']);
  assert.deepEqual(batch.positions, ['description', 'pinned_comment', 'comment_reply', 'video']);
  assert.equal(batch.destinationUrl, 'https://go.hotmart.com/K103806991N');
  assert.equal(batch.trackingParameter, 'src');
});

test('gera link preservando destino, origem e UTMs', () => {
  const url = new URL(buildDestinationUrl({
    destination_url: 'https://pay.hotmart.com/X123?off=abc',
    tracking_parameter: 'sck',
    tracking_code: 'yt|video1|d|a1b2',
    utm_source: 'youtube',
    utm_medium: 'organic',
    utm_campaign: 'video-tdah',
    utm_content: 'descricao',
    utm_term: null,
  }));
  assert.equal(url.searchParams.get('off'), 'abc');
  assert.equal(url.searchParams.get('sck'), 'yt|video1|d|a1b2');
  assert.equal(url.searchParams.get('utm_source'), 'youtube');
  assert.equal(url.searchParams.get('utm_content'), 'descricao');

  const hotlink = new URL(buildDestinationUrl({
    destination_url: 'https://go.hotmart.com/K103806991N?off=abc',
    tracking_parameter: 'src',
    tracking_code: 'yt|video1|c|b2c3',
    utm_source: 'youtube',
    utm_medium: 'organic',
    utm_campaign: 'video-tdah',
    utm_content: 'comentario',
    utm_term: 'mapa7p',
  }));
  assert.equal(hotlink.searchParams.get('off'), 'abc');
  assert.equal(hotlink.searchParams.get('src'), 'yt|video1|c|b2c3');
  assert.equal(hotlink.searchParams.get('sck'), 'yt|video1|c|b2c3');
  assert.equal(hotlink.searchParams.get('utm_source'), 'youtube');
  assert.equal(hotlink.searchParams.get('utm_medium'), 'organic');
  assert.equal(hotlink.searchParams.get('utm_campaign'), 'video-tdah');
  assert.equal(hotlink.searchParams.get('utm_content'), 'comentario');
  assert.equal(hotlink.searchParams.get('utm_term'), 'mapa7p');

  const externalDestination = new URL(buildDestinationUrl({
    destination_url: 'https://example.com/oferta?variant=original',
    tracking_parameter: 'src',
    tracking_code: 'yt|video1|d|a1b2',
    utm_source: 'youtube',
    utm_medium: 'organic',
    utm_campaign: 'video-tdah',
    utm_content: null,
    utm_term: null,
  }));
  assert.equal(externalDestination.searchParams.get('variant'), 'original');
  assert.equal(externalDestination.searchParams.get('src'), 'yt|video1|d|a1b2');
  assert.equal(externalDestination.searchParams.has('sck'), false);
});

test('valida campanha e rejeita protocolo inseguro', () => {
  const campaign = parseCampaignInput({
    name: 'Vídeo TDAH', videoId: 'video1', productId: 'p1', productName: 'Curso',
    destinationUrl: 'https://pay.hotmart.com/X1', trackingParameter: 'sck',
    ctaLabel: 'Conheça o curso', ctaPosition: 'pinned_comment',
  });
  assert.equal(campaign.utmSource, 'youtube');
  assert.equal(campaign.status, 'active');
  assert.throws(() => parseCampaignInput({
    ...campaign, videoId: 'video1', productId: 'p1', productName: 'Curso',
    destinationUrl: 'javascript:alert(1)', ctaPosition: 'description',
  }), (error: any) => error.code === 'invalid_campaign_url');
});

test('click não retém URL completa e classifica dispositivo e bot', () => {
  assert.equal(referrerHost('https://www.youtube.com/watch?v=segredo'), 'www.youtube.com');
  assert.equal(referrerHost('invalido'), null);
  assert.equal(classifyDevice('Mozilla/5.0 (iPhone; Mobile)'), 'mobile');
  assert.equal(classifyDevice('Mozilla/5.0 (Windows NT 10.0)'), 'desktop');
  assert.equal(probableBot('facebookexternalhit/1.1'), true);
  assert.equal(probableBot('Mozilla/5.0'), false);
});
