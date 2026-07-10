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

test('sync persiste day,video e mantém dia ausente como lacuna', async () => {
  const repository = new InMemoryCommercialIntelligenceRepository();
  const result = await syncYoutubeDaily({
    repository,
    startDate: '2026-07-08',
    endDate: '2026-07-10',
    now: new Date('2026-07-10T12:00:00.000Z'),
    readReport: async () => report,
    readMetadata: async () => metadata,
  });

  assert.equal(result.rowsWritten, 3);
  assert.equal(result.videosWritten, 2);
  assert.equal(result.sourceWatermark, '2026-07-10');
  assert.equal(result.status, 'partial');
  assert.ok(result.warnings.includes('youtube_missing_days:1'));
  assert.equal(repository.youtubeDaily.has('fixture-video-001:2026-07-09'), false);
  assert.equal(repository.youtubeVideos.get('fixture-video-002')?.content_type, 'short');
});

test('revisão da fonte atualiza a combinação existente', async () => {
  const repository = new InMemoryCommercialIntelligenceRepository();
  await syncYoutubeDaily({
    repository,
    startDate: '2026-07-08',
    endDate: '2026-07-10',
    now: new Date('2026-07-10T12:00:00.000Z'),
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
    readReport: async () => revised,
    readMetadata: async () => metadata,
  });
  assert.equal(repository.youtubeDaily.get('fixture-video-001:2026-07-08')?.views, 999);
  assert.equal(repository.youtubeDaily.size, 3);
});
