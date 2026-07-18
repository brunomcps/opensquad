import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  decodeTrackingCursor,
  encodeTrackingCursor,
  nextHotmartReconciliationAt,
  parseEventLimit,
  parseEventTypes,
  parseTrackingFilters,
  trackingBucketStarts,
  trafficGroup,
} from '../../../supabase/functions/_shared/trackingHistory.ts';
import { trackingChartAvailability } from '../../../src/components/commercial-intelligence/trackingHistoryModel.ts';

const directory = path.dirname(fileURLToPath(import.meta.url));

test('filtros de histórico convertem datas BRT para intervalo UTC exclusivo', () => {
  const filters = parseTrackingFilters(new URL(
    'https://example.test?start=2026-07-14&end=2026-07-15&granularity=hour&videoId=WrWsJ4MjP04&position=description&traffic=qualified',
  ));
  assert.equal(filters.startIso, '2026-07-14T03:00:00.000Z');
  assert.equal(filters.endExclusiveIso, '2026-07-16T03:00:00.000Z');
  assert.equal(filters.granularity, 'hour');
  assert.equal(filters.videoId, 'WrWsJ4MjP04');
  assert.equal(filters.position, 'description');
  assert.equal(filters.traffic, 'qualified');
});

test('filtro aceita Card do vídeo como origem própria', () => {
  const filters = parseTrackingFilters(new URL(
    'https://example.test?start=2026-07-14&end=2026-07-15&position=video',
  ));
  assert.equal(filters.position, 'video');
});

test('granularidade automática usa hora até 48h, dia até 90d e semana acima disso', () => {
  const hourly = parseTrackingFilters(new URL('https://example.test?start=2026-07-01&end=2026-07-02'));
  const daily = parseTrackingFilters(new URL('https://example.test?start=2026-07-01&end=2026-07-03'));
  const weekly = parseTrackingFilters(new URL('https://example.test?start=2026-01-01&end=2026-07-01'));
  assert.equal(hourly.granularity, 'hour');
  assert.equal(daily.granularity, 'day');
  assert.equal(weekly.granularity, 'week');
});

test('gera buckets vazios contínuos em BRT para o gráfico não comprimir lacunas', () => {
  assert.deepEqual(
    trackingBucketStarts('2026-07-15T03:00:00.000Z', '2026-07-15T06:00:00.000Z', 'hour'),
    ['2026-07-15T03:00:00.000Z', '2026-07-15T04:00:00.000Z', '2026-07-15T05:00:00.000Z'],
  );
  assert.deepEqual(
    trackingBucketStarts('2026-07-15T03:00:00.000Z', '2026-07-18T03:00:00.000Z', 'day'),
    ['2026-07-15T03:00:00.000Z', '2026-07-16T03:00:00.000Z', '2026-07-17T03:00:00.000Z'],
  );
  assert.deepEqual(
    trackingBucketStarts('2026-07-15T03:00:00.000Z', '2026-07-29T03:00:00.000Z', 'week'),
    ['2026-07-13T03:00:00.000Z', '2026-07-20T03:00:00.000Z', '2026-07-27T03:00:00.000Z'],
  );
});

test('filtros rejeitam período, posição e tráfego inválidos', () => {
  assert.throws(
    () => parseTrackingFilters(new URL('https://example.test?start=2026-07-15&end=2026-07-14')),
    (error: any) => error.code === 'invalid_tracking_period' && error.statusCode === 400,
  );
  assert.throws(
    () => parseTrackingFilters(new URL('https://example.test?position=bio')),
    (error: any) => error.code === 'invalid_tracking_filter',
  );
  assert.throws(
    () => parseTrackingFilters(new URL('https://example.test?traffic=maybe')),
    (error: any) => error.code === 'invalid_tracking_filter',
  );
});

test('cursor preserva timestamp e desempate UTF-8 sem expor formato SQL', () => {
  const cursor = { occurredAt: '2026-07-15T11:03:23.456Z', sortId: 's:transação-ç/💳|A+B' };
  const encoded = encodeTrackingCursor(cursor);
  assert.doesNotMatch(encoded, /[+/=]/);
  assert.deepEqual(decodeTrackingCursor(encoded), cursor);
  assert.throws(
    () => decodeTrackingCursor('nao-e-cursor'),
    (error: any) => error.code === 'invalid_tracking_cursor' && error.statusCode === 400,
  );
  assert.throws(() => encodeTrackingCursor({ ...cursor, sortId: 'x:sem-prefixo' }));
  assert.throws(() => encodeTrackingCursor({ ...cursor, sortId: 's:controle\u0007' }));
  const controlCursor = Buffer.from(JSON.stringify({ ...cursor, sortId: 's:controle\u0007' }), 'utf8').toString('base64url');
  assert.throws(() => decodeTrackingCursor(controlCursor));
});

test('disponibilidade do gráfico depende dos valores e reconhece adicional e ambígua', () => {
  const zero = {
    bucketStart: '2026-07-15T03:00:00.000Z',
    clickDescription: 0, clickPinned: 0, clickReply: 0, clickVideo: 0, clickOther: 0,
    saleDescription: 0, salePinned: 0, saleReply: 0, saleVideo: 0,
    saleAdditional: 0, saleUnattributed: 0, saleAmbiguous: 0,
  };
  assert.deepEqual(trackingChartAvailability([zero]), { hasClicks: false, hasSales: false });
  assert.deepEqual(trackingChartAvailability([{ ...zero, clickReply: 1 }]), { hasClicks: true, hasSales: false });
  assert.deepEqual(trackingChartAvailability([{ ...zero, clickVideo: 1 }]), { hasClicks: true, hasSales: false });
  assert.deepEqual(trackingChartAvailability([{ ...zero, saleVideo: 1 }]), { hasClicks: false, hasSales: true });
  assert.deepEqual(trackingChartAvailability([{ ...zero, saleAdditional: 1 }]), { hasClicks: false, hasSales: true });
  assert.deepEqual(trackingChartAvailability([{ ...zero, saleAmbiguous: 1 }]), { hasClicks: false, hasSales: true });
});

test('sucesso posterior não apaga nem resolve em massa incidentes de clique perdido', () => {
  const redirect = fs.readFileSync(
    path.resolve(directory, '../../../supabase/functions/ci-campaign-redirect/index.ts'),
    'utf8',
  );
  assert.match(redirect, /event_type:\s*'click_persistence_failed'/);
  assert.doesNotMatch(redirect, /resolved_at|resolveClickPersistenceFailures|click_persistence_recovery/);
});

test('tipos, limite e grupos de tráfego têm contrato fechado', () => {
  assert.deepEqual(parseEventTypes(null), ['click', 'sale']);
  assert.deepEqual(parseEventTypes('sale,click,sale'), ['sale', 'click']);
  assert.equal(parseEventLimit(null), 50);
  assert.equal(parseEventLimit('100'), 100);
  assert.throws(() => parseEventLimit('101'));
  assert.equal(trafficGroup('qualified'), 'qualified');
  assert.equal(trafficGroup('scanner'), 'technical');
  assert.equal(trafficGroup('unknown'), 'unknown');
});

test('próxima reconciliação respeita 06:40 em America/Sao_Paulo', () => {
  assert.equal(
    nextHotmartReconciliationAt(new Date('2026-07-15T08:00:00.000Z')),
    '2026-07-15T09:40:00.000Z',
  );
  assert.equal(
    nextHotmartReconciliationAt(new Date('2026-07-15T10:00:00.000Z')),
    '2026-07-16T09:40:00.000Z',
  );
});

test('migration preserva eventos brutos, auditoria operacional e cursores indexados', () => {
  const sql = fs.readFileSync(
    path.resolve(directory, '../../../supabase/migrations/20260715120000_ci_tracking_history.sql'),
    'utf8',
  );
  assert.match(sql, /traffic_classification text not null default 'unknown'/i);
  assert.match(sql, /exclusion_reason text/i);
  assert.match(sql, /fingerprint_hash text/i);
  assert.match(sql, /create table if not exists public\.ci_operational_events/i);
  assert.match(sql, /ci_click_events\(clicked_at desc, click_id desc\)/i);
  assert.match(sql, /create or replace function public\.ci_tracking_series/i);
  assert.match(sql, /create or replace function public\.ci_tracking_events/i);
  assert.match(sql, /create or replace function public\.ci_tracking_freshness/i);
  assert.match(sql, /campaigns\.product_id = '6966825'/i);
  assert.match(sql, /campaigns\.cta_position in \('description', 'pinned_comment', 'comment_reply', 'video'\)/i);
  assert.match(sql, /transactions\.status = 'approved'/i);
  assert.match(sql, /row_financial_incomplete/i);
  assert.match(sql, /all_transaction_matches/i);
  assert.match(sql, /matches\.match_count > 1 or all_matches\.match_count > 1/i);
  assert.match(sql, /md5\('ci-sale:' \|\| transactions\.transaction_id\)/i);
  assert.doesNotMatch(sql, /'sale:'\s*\|\|\s*transactions\.transaction_id/i);
  assert.match(sql, /last_hotmart_reconciliation_attempt_at/i);
  assert.match(sql, /last_hotmart_reconciliation_success_at/i);
  assert.match(sql, /last_hotmart_reconciliation_partial_at/i);
  assert.match(sql, /status = 'success'/i);
  assert.doesNotMatch(sql, /status in \('success', 'partial'\)/i);
  assert.match(sql, /to_regclass\('cron\.job'\)/i);
  assert.match(sql, /where jobname = \$1/i);
  assert.match(sql, /and resolved_at is null/i);
  assert.match(sql, /America\/Sao_Paulo/i);
  assert.doesNotMatch(sql, /buyer_key\s+text|email\s+text|ip_address|raw_user_agent/i);
});

test('migration aditiva inclui Card do vídeo nas RPCs sem operação destrutiva', () => {
  const sql = fs.readFileSync(
    path.resolve(directory, '../../../supabase/migrations/20260717021000_ci_youtube_card_tracking.sql'),
    'utf8',
  );
  assert.match(sql, /pg_get_functiondef/i);
  assert.match(sql, /'description'', ''pinned_comment'', ''comment_reply'', ''video'/i);
  assert.match(sql, /ci_tracking_series/i);
  assert.match(sql, /ci_tracking_events/i);
  assert.doesNotMatch(sql, /\bdrop\s+(table|schema|function)\b/i);
});

test('endpoints de histórico exigem membro viewer e usam RPCs agregadas', () => {
  for (const [file, rpc] of [
    ['ci-tracking-series/index.ts', 'ci_tracking_series'],
    ['ci-tracking-events/index.ts', 'ci_tracking_events'],
  ]) {
    const source = fs.readFileSync(path.resolve(directory, `../../../supabase/functions/${file}`), 'utf8');
    assert.match(source, /authorizeMember\(request, client, 'viewer'\)/);
    assert.match(source, new RegExp(`rpc\\('${rpc}'`));
    assert.match(source, /ci_tracking_freshness/);
    assert.doesNotMatch(source, /buyer_key|buyer.*email|document|phone|ip_address/i);
  }
  const series = fs.readFileSync(path.resolve(directory, '../../../supabase/functions/ci-tracking-series/index.ts'), 'utf8');
  assert.match(series, /ambiguousSales/);
  assert.match(series, /financialDataIncomplete/);
  assert.match(series, /bucket\.sales\.additional \+= count;\s*bucket\.sales\.total \+= count;/);
  assert.match(series, /lastHotmartReconciliationAttemptAt/);
  assert.match(series, /lastHotmartReconciliationSuccessAt/);
  assert.match(series, /lastHotmartReconciliationPartialAt/);
});
