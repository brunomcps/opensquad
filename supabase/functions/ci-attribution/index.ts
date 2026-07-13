import { authorizeMember } from '../_shared/auth.ts';
import { buildDirectAttributionReport } from '../_shared/attribution.ts';
import { serviceClient } from '../_shared/client.ts';
import { CommercialIntelligenceError } from '../_shared/errors.ts';
import { errorResponse, json, preflight } from '../_shared/http.ts';

function validDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && new Date(`${value}T12:00:00.000Z`).toISOString().slice(0, 10) === value;
}

function shift(date: string, days: number): string {
  return new Date(Date.parse(`${date}T12:00:00.000Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

async function loadAll(queryFactory: (from: number, to: number) => PromiseLike<any>): Promise<any[]> {
  const rows: any[] = [];
  for (let from = 0; ; from += 1_000) {
    const result = await queryFactory(from, from + 999);
    if (result.error) throw new CommercialIntelligenceError('database_error', 'Não foi possível calcular a atribuição.', 503);
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
    const url = new URL(request.url);
    const today = new Date().toISOString().slice(0, 10);
    const start = url.searchParams.get('start') || shift(today, -180);
    const end = url.searchParams.get('end') || today;
    const currency = (url.searchParams.get('currency') || 'BRL').trim().toUpperCase();
    if (!validDate(start) || !validDate(end) || start > end) throw new CommercialIntelligenceError('invalid_period', 'Período inválido.', 400);
    if (!/^[A-Z]{3}$/.test(currency)) throw new CommercialIntelligenceError('invalid_currency', 'Moeda inválida.', 400);
    const startIso = `${start}T00:00:00-03:00`;
    const endIso = `${end}T23:59:59.999-03:00`;

    const [campaigns, transactions, clicks] = await Promise.all([
      loadAll((from, to) => client.from('ci_campaigns').select('*').order('campaign_id').range(from, to)),
      loadAll((from, to) => client.from('ci_hotmart_transactions')
        .select('transaction_id,status,approved_date,gross_value,gross_currency,fee_value,fee_currency,tracking_src,tracking_sck,tracking_xcod')
        .gte('approved_date', startIso).lte('approved_date', endIso).order('transaction_id').range(from, to)),
      loadAll((from, to) => client.from('ci_click_events').select('campaign_id,is_bot')
        .gte('clicked_at', startIso).lte('clicked_at', endIso).order('click_id').range(from, to)),
    ]);
    const attribution = buildDirectAttributionReport({ campaigns, transactions, clicks, currency });
    return json(request, { ok: true, attribution: { ...attribution, period: { start, end } }, member: { role: member.role } });
  } catch (error) {
    return errorResponse(request, error);
  }
});
