import assert from 'node:assert/strict';
import test from 'node:test';
import { buildTemporalAssociationReport, parseAssociationFilters } from '../../../supabase/functions/_shared/association.ts';

function sale(date: string, net = 90) {
  return {
    status: 'approved', approved_date: `${date}T15:00:00.000Z`, order_date: null,
    gross_value: net + 10, gross_currency: 'BRL', fee_value: 10, fee_currency: 'BRL',
  };
}

test('compara janela posterior com mesmos dias da semana anteriores', () => {
  const baseline = ['2026-05-04', '2026-05-11', '2026-05-18', '2026-05-25'];
  const transactions = [
    ...baseline.map(date => sale(date)),
    sale('2026-06-01', 180), sale('2026-06-01', 180),
  ];
  const report = buildTemporalAssociationReport({
    videos: [{ video_id: 'v1', title: 'Vídeo', published_at: '2026-06-01T12:00:00-03:00', content_type: 'long', thumbnail_url: null }],
    youtubeDaily: [{ video_id: 'v1', metric_date: '2026-06-01', views: 1000 }],
    transactions,
    start: '2026-06-01', end: '2026-06-30', postWindowDays: 7, baselineWeeks: 4,
  });
  assert.equal(report.method.label, 'Associação temporal exploratória');
  assert.equal(report.totals.videosAnalyzed, 1);
  assert.equal(report.videos[0].actualSales, 2);
  assert.equal(report.videos[0].expectedSales, 1);
  assert.equal(report.videos[0].actualNetAfterFees, 360);
  assert.equal(report.videos[0].expectedNetAfterFees, 90);
  assert.equal(report.videos[0].netDifference, 270);
  assert.equal(report.videos[0].views, 1000);
  assert.equal(report.videos[0].signal, 'above');
});

test('não analisa publicação sem baseline ou janela completa', () => {
  const report = buildTemporalAssociationReport({
    videos: [{ video_id: 'v1', title: 'Recente', published_at: '2026-07-10T12:00:00-03:00', content_type: 'long', thumbnail_url: null }],
    youtubeDaily: [], transactions: [sale('2026-07-01')], start: '2026-07-01', end: '2026-07-13',
  });
  assert.equal(report.totals.videosAnalyzed, 0);
  assert.equal(report.totals.insufficientData, 1);
});

test('janela de 14 dias não usa dias posteriores à publicação como baseline', () => {
  const transactions = [
    sale('2026-05-04'),
    sale('2026-05-25'),
    ...Array.from({ length: 7 }, (_, index) => sale(new Date(Date.parse('2026-06-01T12:00:00.000Z') + index * 86_400_000).toISOString().slice(0, 10), 900)),
  ];
  const report = buildTemporalAssociationReport({
    videos: [{ video_id: 'v1', title: 'Vídeo', published_at: '2026-06-01T12:00:00-03:00', content_type: 'long', thumbnail_url: null }],
    youtubeDaily: [], transactions, start: '2026-06-01', end: '2026-06-30', postWindowDays: 14, baselineWeeks: 4,
  });
  assert.equal(report.videos[0].actualSales, 7);
  assert.equal(report.videos[0].expectedSales, 1);
});

test('valida filtros do endpoint', () => {
  const filters = parseAssociationFilters(new URL('https://example.test?start=2026-01-01&end=2026-07-13&window=14'));
  assert.equal(filters.postWindowDays, 14);
  assert.throws(
    () => parseAssociationFilters(new URL('https://example.test?start=2026-07-13&end=2026-01-01')),
    (error: any) => error.code === 'invalid_period',
  );
});
