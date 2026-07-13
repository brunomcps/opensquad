import { authorizeMember } from '../_shared/auth.ts';
import { serviceClient } from '../_shared/client.ts';
import { CommercialIntelligenceError } from '../_shared/errors.ts';
import { errorResponse, json, preflight } from '../_shared/http.ts';
import {
  buildCommercialOverview,
  parseOverviewFilters,
  type OverviewTransaction,
} from '../_shared/overview.ts';

const PAGE_SIZE = 1_000;
const TRANSACTION_FIELDS = [
  'buyer_key',
  'product_id',
  'product_name',
  'status',
  'order_date',
  'approved_date',
  'gross_value',
  'gross_currency',
  'fee_value',
  'fee_currency',
  'last_event_at',
  'last_reconciled_at',
].join(',');

async function loadTransactions(client: any): Promise<OverviewTransaction[]> {
  const rows: OverviewTransaction[] = [];
  for (let page = 0; page < 100; page += 1) {
    const from = page * PAGE_SIZE;
    const result = await client
      .from('ci_hotmart_transactions')
      .select(TRANSACTION_FIELDS)
      .order('created_at', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (result.error) {
      throw new CommercialIntelligenceError('overview_query_failed', 'Não foi possível consultar os dados comerciais.', 503);
    }
    const pageRows = (result.data || []) as OverviewTransaction[];
    rows.push(...pageRows);
    if (pageRows.length < PAGE_SIZE) return rows;
  }
  throw new CommercialIntelligenceError('overview_row_limit', 'O volume consultado excedeu o limite operacional.', 503);
}

async function latestReconciliation(client: any): Promise<string | null> {
  const result = await client
    .from('ci_sync_runs')
    .select('finished_at')
    .eq('source', 'hotmart_reconciliation')
    .in('status', ['success', 'partial'])
    .not('finished_at', 'is', null)
    .order('finished_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (result.error) return null;
  return result.data?.finished_at || null;
}

Deno.serve(async request => {
  const options = preflight(request);
  if (options) return options;
  if (request.method !== 'GET') {
    return json(request, { ok: false, error: { code: 'method_not_allowed', message: 'Método não permitido.' } }, 405);
  }

  try {
    const client = serviceClient();
    const member = await authorizeMember(request, client, 'viewer');
    const filters = parseOverviewFilters(new URL(request.url));
    const [rows, fallbackUpdatedAt] = await Promise.all([
      loadTransactions(client),
      latestReconciliation(client),
    ]);
    const overview = buildCommercialOverview({ rows, filters, fallbackUpdatedAt });
    return json(request, { ok: true, overview, member: { role: member.role } });
  } catch (error) {
    return errorResponse(request, error);
  }
});
