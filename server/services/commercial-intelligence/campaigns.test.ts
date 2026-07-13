import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildDestinationUrl,
  classifyDevice,
  generateCampaignSlug,
  generateTrackingCode,
  parseCampaignInput,
  probableBot,
  referrerHost,
} from '../../../supabase/functions/_shared/campaigns.ts';

test('gera código compacto aceito pela convenção da Hotmart', () => {
  const code = generateTrackingCode('OHmYcSx33FY', 'description', 'a1b2');
  assert.equal(code, 'yt|OHmYcSx33FY|d|a1b2');
  assert.ok(code.length <= 30);
  assert.doesNotMatch(code, /_/);
  assert.match(code, /^[A-Za-z0-9|.-]+$/);
  assert.equal(generateCampaignSlug('ABCDEF123456'), 'ci-abcdef123456');
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
