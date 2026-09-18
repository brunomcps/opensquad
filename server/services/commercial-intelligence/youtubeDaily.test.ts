import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { InMemoryCommercialIntelligenceRepository } from './repository.js';
import {
  parseIsoDuration,
  parseYoutubeDailyReport,
  syncYoutubeDaily,
} from './youtubeDaily.js';

const fixturePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../fixtures/commercial-intelligence/youtube-day-video.json',
);
const report = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

const metadata = [
  {
    id: 'fixture-video-001',
    snippet: {
      title: 'Vídeo fixture longo',
      publishedAt: '2026-07-01T12:00:00Z',
      liveBroadcastContent: 'none',
      thumbnails: { high: { url: 'https://example.test/video-1.jpg' } },
    },
    contentDetails: { duration: 'PT12M30S' },
  },
  {
    id: 'fixture-video-002',
    snippet: {
      title: 'Vídeo fixture curto',
      publishedAt: '2026-07-02T12:00:00Z',
      liveBroadcastContent: 'none',
      thumbnails: {},
    },
    contentDetails: { duration: 'PT45S' },
  },
];

test('parser usa columnHeaders em vez de posição fixa', () => {
  const rows = parseYoutubeDailyReport(report, '2026-07-10T12:00:00.000Z');
  assert.equal(rows[0].video_id, 'fixture-video-001');
  assert.equal(rows[0].metric_date, '2026-07-08');
  assert.equal(rows[0].views, 100);
  assert.equal(rows[0].comments, 3);
  assert.equal(rows[0].estimated_minutes_watched, 450.5);
});

test('converte duração ISO 8601', () => {
  assert.equal(parseIsoDuration('PT1H2M3S'), 3723);
  assert.equal(parseIsoDuration('PT45S'), 45);
  assert.equal(parseIsoDuration('invalid'), null);
});

test('preserva ajustes negativos de engajamento', () => {
  const rows = parseYoutubeDailyReport({
    columnHeaders: [
      { name: 'day' },
      { name: 'video' },
      { name: 'views' },
      { name: 'estimatedMinutesWatched' },
      { name: 'likes' },
    ],
    rows: [['2026-07-10', 'fixture-video-001', 10, 20, -1]],
  }, '2026-07-10T12:00:00.000Z');

  assert.equal(rows[0].likes, -1);
});

test('sync persiste day,video e mantém dia ausente como lacuna', async () => {
  const repository = new InMemoryCommercialIntelligenceRepository();
  let requestedVideoIds: string[] = [];
  const result = await syncYoutubeDaily({
    repository,
    startDate: '2026-07-08',
    endDate: '2026-07-10',
    now: new Date('2026-07-10T12:00:00.000Z'),
    readVideoIds: async () => ['fixture-video-001', 'fixture-video-002'],
    readReport: async input => {
      requestedVideoIds = input.videoIds;
      return report;
    },
    readMetadata: async () => metadata,
  });

  assert.equal(result.rowsWritten, 3);
  assert.equal(result.videosWritten, 2);
  assert.equal(result.sourceWatermark, '2026-07-10');
  assert.equal(result.status, 'partial');
  assert.ok(result.warnings.includes('youtube_missing_days:1'));
  assert.equal(repository.youtubeDaily.has('fixture-video-001:2026-07-09'), false);
  assert.equal(repository.youtubeVideos.get('fixture-video-002')?.content_type, 'short');
  assert.deepEqual(requestedVideoIds, ['fixture-video-001', 'fixture-video-002']);
});

test('relatório é pedido um dia por vez, e a duplicata vídeo+dia não conta duas vezes', async () => {
  const repository = new InMemoryCommercialIntelligenceRepository();
  const pedidos: Array<{ startDate: string; endDate: string }> = [];
  const result = await syncYoutubeDaily({
    repository,
    startDate: '2026-07-08',
    endDate: '2026-07-10',
    now: new Date('2026-07-10T12:00:00.000Z'),
    readVideoIds: async () => ['fixture-video-001', 'fixture-video-002'],
    // A fixture devolve os três dias em toda chamada, como um relatório que
    // ignora o intervalo: o sync precisa deduplicar em vez de gravar 9 linhas.
    readReport: async input => { pedidos.push({ startDate: input.startDate, endDate: input.endDate }); return report; },
    readMetadata: async () => metadata,
  });
  assert.deepEqual(pedidos, [
    { startDate: '2026-07-08', endDate: '2026-07-08' },
    { startDate: '2026-07-09', endDate: '2026-07-09' },
    { startDate: '2026-07-10', endDate: '2026-07-10' },
  ]);
  assert.equal(result.rowsWritten, 3);
  assert.equal(repository.youtubeDaily.size, 3);
});

test('metadado, privacidade e total de vida entram pra vídeo público, catalogado ou com view; upload não listado novo fica fora', async () => {
  const repository = new InMemoryCommercialIntelligenceRepository();
  // 003 já estava no catálogo (com título velho) e não tem view na janela: tem
  // que ser atualizado mesmo assim. 004 é upload não listado que nunca entrou e
  // não teve view: não pode entrar (em 18/09/2026 isso poluiu o gerador de links).
  await repository.upsertYoutubeVideos([{
    video_id: 'fixture-video-003', title: 'Título velho', published_at: null, duration_seconds: null,
    content_type: 'unknown', thumbnail_url: null, privacy_status: null, metadata_refreshed_at: '2026-01-01T00:00:00.000Z',
  }]);
  const comStatus = [
    { ...metadata[0], status: { privacyStatus: 'public' }, statistics: { viewCount: '194201', likeCount: '15851', commentCount: '2075' } },
    { ...metadata[1], status: { privacyStatus: 'unlisted' } },
    {
      id: 'fixture-video-003',
      snippet: { title: 'Vídeo antigo sem view na janela', publishedAt: '2025-10-14T20:05:27Z', liveBroadcastContent: 'none', thumbnails: {} },
      contentDetails: { duration: 'PT14M54S' },
      status: { privacyStatus: 'private' },
      statistics: { viewCount: '355856' },
    },
    {
      id: 'fixture-video-004',
      snippet: { title: 'Rascunho não listado', publishedAt: '2025-01-01T00:00:00Z', liveBroadcastContent: 'none', thumbnails: {} },
      contentDetails: { duration: 'PT1M' },
      status: { privacyStatus: 'unlisted' },
      statistics: { viewCount: '12' },
    },
  ];
  const result = await syncYoutubeDaily({
    repository,
    startDate: '2026-07-08',
    endDate: '2026-07-10',
    now: new Date('2026-07-10T12:00:00.000Z'),
    readVideoIds: async () => ['fixture-video-001', 'fixture-video-002', 'fixture-video-003', 'fixture-video-004'],
    readReport: async () => report,
    readMetadata: async () => comStatus,
  });
  assert.equal(result.videosWritten, 3);
  assert.equal(repository.youtubeVideos.has('fixture-video-004'), false, 'upload não listado sem view e fora do catálogo não entra');
  const v1 = repository.youtubeVideos.get('fixture-video-001') as unknown as Record<string, unknown>;
  assert.equal(v1.privacy_status, 'public');
  assert.equal(v1.lifetime_views, 194201);
  assert.equal(v1.lifetime_likes, 15851);
  assert.equal(v1.lifetime_comments, 2075);
  const v2 = repository.youtubeVideos.get('fixture-video-002') as unknown as Record<string, unknown>;
  assert.equal(v2.privacy_status, 'unlisted');
  assert.equal(v2.lifetime_views, undefined, 'sem statistics na resposta, o total de vida não é tocado');
  const v3 = repository.youtubeVideos.get('fixture-video-003') as unknown as Record<string, unknown>;
  assert.equal(v3.title, 'Vídeo antigo sem view na janela');
  assert.equal(v3.privacy_status, 'private');
  assert.equal(v3.lifetime_views, 355856);
  assert.equal(v3.lifetime_likes, null);
});

test('revisão da fonte atualiza a combinação existente', async () => {
  const repository = new InMemoryCommercialIntelligenceRepository();
  await syncYoutubeDaily({
    repository,
    startDate: '2026-07-08',
    endDate: '2026-07-10',
    now: new Date('2026-07-10T12:00:00.000Z'),
    readVideoIds: async () => ['fixture-video-001', 'fixture-video-002'],
    readReport: async () => report,
    readMetadata: async () => metadata,
  });
  const revised = JSON.parse(JSON.stringify(report));
  revised.rows[0][3] = 999;
  await syncYoutubeDaily({
    repository,
    startDate: '2026-07-08',
    endDate: '2026-07-10',
    now: new Date('2026-07-11T12:00:00.000Z'),
    readVideoIds: async () => ['fixture-video-001', 'fixture-video-002'],
    readReport: async () => revised,
    readMetadata: async () => metadata,
  });
  assert.equal(repository.youtubeDaily.get('fixture-video-001:2026-07-08')?.views, 999);
  assert.equal(repository.youtubeDaily.size, 3);
});
