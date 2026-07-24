import { authorizeMember } from '../_shared/auth.ts';
import { buildTemporalAssociationReport, parseAssociationFilters } from '../_shared/association.ts';
import { serviceClient } from '../_shared/client.ts';
import { CommercialIntelligenceError } from '../_shared/errors.ts';
import { errorResponse, json, preflight } from '../_shared/http.ts';

function shift(date: string, days: number): string {
  return new Date(Date.parse(`${date}T12:00:00.000Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

async function loadAll(queryFactory: (from: number, to: number) => PromiseLike<any>): Promise<any[]> {
  const rows: any[] = [];
  for (let from = 0; ; from += 1_000) {
    const result = await queryFactory(from, from + 999);
    if (result.error) throw new CommercialIntelligenceError('database_error', 'Não foi possível calcular a associação.', 503);
    rows.push(...(result.data || []));
    if ((result.data || []).length < 1_000) return rows;
  }
}

Deno.serve(async request => {
  const options = preflight(request);
  if (options) return options;
  if (request.method !== 'GET') return json(request, { ok: false, error: { code: 'method_not_allowed', message: 'Método não permitido.' } }, 405);
  try {
    const client = serviceClient();
    const member = await authorizeMember(request, client, 'viewer');
    const filters = parseAssociationFilters(new URL(request.url));
    const lookback = shift(filters.start, -7 * filters.baselineWeeks);
    const youtubeEnd = shift(filters.end, filters.postWindowDays - 1);
    const [videos, youtubeDaily, transactions] = await Promise.all([
      loadAll((from, to) => client.from('ci_youtube_videos')
        .select('video_id,title,published_at,content_type,thumbnail_url')
        .gte('published_at', `${filters.start}T00:00:00-03:00`)
        .lte('published_at', `${filters.end}T23:59:59.999-03:00`).order('video_id').range(from, to)),
      loadAll((from, to) => client.from('ci_youtube_daily').select('video_id,metric_date,views')
        .gte('metric_date', filters.start).lte('metric_date', youtubeEnd).order('video_id').order('metric_date').range(from, to)),
      loadAll((from, to) => client.from('ci_hotmart_transactions')
        .select('transaction_id,status,approved_date,order_date,gross_value,gross_currency,fee_value,fee_currency')
        .gte('approved_date', `${lookback}T00:00:00-03:00`)
        .lte('approved_date', `${filters.end}T23:59:59.999-03:00`).order('transaction_id').range(from, to)),
    ]);
    const association = buildTemporalAssociationReport({ videos, youtubeDaily, transactions, ...filters });
    return json(request, { ok: true, association, member: { role: member.role } });
  } catch (error) {
    return errorResponse(request, error);
  }
});
