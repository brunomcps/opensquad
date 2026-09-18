-- Etapa 2 da faxina do Rastreamento (18/09/2026): UMA conta só, no banco.
--
-- Antes, o resumo do topo (ci_tracking_series, SQL) e os cards por vídeo
-- (ci-attribution, TypeScript com ~11 buscas paginadas de 1.000 linhas) usavam
-- cálculos diferentes: o card DESCARTAVA venda em moeda estrangeira (55 de 584
-- em 60 dias), não contava devolução, e demorava. Esta função devolve, numa
-- chamada, tudo que os cards precisam, com as MESMAS regras do resumo:
--   * código de origem = sck, src ou xcod, minúsculo e sem espaços;
--   * venda principal = produto igual ao da campanha (ou oferta, se sem produto);
--   * venda adicional = outro produto que chegou por um link de campanha;
--   * ambígua = código que bate em mais de uma campanha;
--   * venda em moeda estrangeira CONTA como venda; o dinheiro vai separado
--     (foreign_breakdown), sem cotação inventada;
--   * devolvida = reembolso/chargeback de venda aprovada no período;
--   * líquido = producer_net na moeda pedida, senão bruto - taxa na moeda pedida.

create or replace function public.ci_campaign_attribution_report(
  p_start timestamptz,
  p_end timestamptz,
  p_currency text default 'BRL',
  p_channel text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_currency text := upper(coalesce(p_currency, 'BRL'));
  v_result jsonb;
begin
  if p_start is null or p_end is null or p_start >= p_end then
    raise exception 'invalid attribution period' using errcode = '22023';
  end if;
  if p_channel is not null and p_channel not in ('youtube', 'instagram') then
    raise exception 'invalid attribution channel' using errcode = '22023';
  end if;

  with campaigns as (
    select c.*, lower(btrim(c.tracking_code)) as code_key,
           lower(btrim(coalesce(c.product_id, ''))) as product_key,
           lower(btrim(coalesce(c.offer_code, ''))) as offer_key
    from public.ci_campaigns c
  ),
  scope as (
    select * from campaigns where p_channel is null or channel = p_channel
  ),
  tx as (
    select t.*,
           lower(btrim(coalesce(t.product_id, ''))) as product_key,
           lower(btrim(coalesce(t.offer_code, ''))) as offer_key,
           case
             when t.producer_net_value is not null and upper(coalesce(t.producer_net_currency, '')) = v_currency then t.producer_net_value
             when upper(coalesce(t.gross_currency, '')) = v_currency and upper(coalesce(t.fee_currency, '')) = v_currency
                  and t.gross_value is not null and t.fee_value is not null then t.gross_value - t.fee_value
             else null
           end as net_in_currency,
           upper(coalesce(t.producer_net_currency, t.gross_currency, '')) as money_currency,
           coalesce(t.producer_net_value, t.gross_value) as money_value
    from public.ci_hotmart_transactions t
    where t.approved_date >= p_start and t.approved_date < p_end
      and t.status in ('approved', 'refunded', 'chargeback')
  ),
  tx_codes as (
    select tx.transaction_id, lower(btrim(code)) as code_key
    from tx cross join lateral unnest(array[tx.tracking_sck, tx.tracking_src, tx.tracking_xcod]) as origin(code)
    where code is not null and btrim(code) <> ''
    group by tx.transaction_id, lower(btrim(code))
  ),
  tx_matches as (
    select tc.transaction_id, c.campaign_id, c.channel, c.product_key, c.offer_key
    from tx_codes tc join campaigns c on c.code_key = tc.code_key
    group by tc.transaction_id, c.campaign_id, c.channel, c.product_key, c.offer_key
  ),
  tx_primary as (
    select m.transaction_id, m.campaign_id
    from tx_matches m join tx on tx.transaction_id = m.transaction_id
    where (tx.product_key <> '' and tx.product_key = m.product_key)
       or (tx.product_key = '' and tx.offer_key <> '' and tx.offer_key = m.offer_key)
  ),
  tx_classified as (
    select tx.transaction_id, tx.status, tx.net_in_currency, tx.money_currency, tx.money_value,
           exists (select 1 from campaigns c where (tx.product_key <> '' and c.product_key = tx.product_key)
                                               or (tx.product_key = '' and tx.offer_key <> '' and c.offer_key = tx.offer_key)) as targets_campaign_product,
           (select count(*) from tx_codes tc where tc.transaction_id = tx.transaction_id) as code_count,
           (select count(distinct campaign_id) from tx_matches m where m.transaction_id = tx.transaction_id) as match_count,
           (select count(*) from tx_primary p where p.transaction_id = tx.transaction_id) as primary_count,
           (select min(campaign_id::text)::uuid from tx_primary p where p.transaction_id = tx.transaction_id) as primary_campaign_id,
           (select min(campaign_id::text)::uuid from tx_matches m where m.transaction_id = tx.transaction_id) as any_campaign_id,
           (tx.money_currency <> v_currency and tx.money_currency <> '') as is_foreign
    from tx
  ),
  attributed as (
    -- venda principal: exatamente 1 campanha do produto certo
    select transaction_id, primary_campaign_id as campaign_id, 'primary'::text as kind, status, net_in_currency, money_currency, money_value, is_foreign
    from tx_classified where targets_campaign_product and primary_count = 1
    union all
    -- venda adicional: produto sem campanha própria que chegou por 1 link
    select transaction_id, any_campaign_id, 'additional', status, net_in_currency, money_currency, money_value, is_foreign
    from tx_classified where not targets_campaign_product and match_count = 1
  ),
  per_campaign as (
    select a.campaign_id,
      count(*) filter (where kind = 'primary' and status = 'approved') as sales,
      count(*) filter (where kind = 'additional' and status = 'approved') as additional_sales,
      count(*) filter (where kind = 'primary' and status <> 'approved') as refunds,
      count(*) filter (where kind = 'additional' and status <> 'approved') as additional_refunds,
      count(*) filter (where kind = 'primary' and status = 'approved' and net_in_currency is null and not is_foreign) as financial_incomplete,
      count(*) filter (where kind = 'additional' and status = 'approved' and net_in_currency is null and not is_foreign) as additional_financial_incomplete,
      coalesce(sum(net_in_currency) filter (where kind = 'primary' and status = 'approved'), 0) as net,
      coalesce(sum(net_in_currency) filter (where kind = 'additional' and status = 'approved'), 0) as additional_net,
      count(*) filter (where status = 'approved' and is_foreign) as foreign_sales,
      (select coalesce(jsonb_object_agg(cur, tot), '{}'::jsonb)
         from (select money_currency as cur, round(sum(money_value)::numeric, 2) as tot
                 from attributed b where b.campaign_id = a.campaign_id and b.status = 'approved' and b.is_foreign
                 group by money_currency) f) as foreign_breakdown
    from attributed a
    group by a.campaign_id
  ),
  clicks as (
    select e.campaign_id,
      count(*) filter (where e.traffic_classification = 'qualified') as qualified,
      count(*) as total,
      max(e.clicked_at) as last_click_at,
      max(e.clicked_at) filter (where e.traffic_classification = 'qualified') as last_qualified_click_at
    from public.ci_click_events e
    where e.clicked_at >= p_start and e.clicked_at < p_end
    group by e.campaign_id
  ),
  campaign_rows as (
    select s.campaign_id, s.name, s.channel, s.tracking_code, s.video_id, s.product_id, s.product_name,
           s.cta_label, s.cta_position, s.status as campaign_status,
           coalesce(k.qualified, 0) as clicks, coalesce(k.total, 0) as clicks_total,
           k.last_click_at, k.last_qualified_click_at,
           coalesce(p.sales, 0) as sales, coalesce(p.additional_sales, 0) as additional_sales,
           coalesce(p.refunds, 0) as refunds, coalesce(p.additional_refunds, 0) as additional_refunds,
           coalesce(p.financial_incomplete, 0) as financial_incomplete,
           coalesce(p.additional_financial_incomplete, 0) as additional_financial_incomplete,
           round(coalesce(p.net, 0)::numeric, 2) as net, round(coalesce(p.additional_net, 0)::numeric, 2) as additional_net,
           coalesce(p.foreign_sales, 0) as foreign_sales, coalesce(p.foreign_breakdown, '{}'::jsonb) as foreign_breakdown
    from scope s
    left join per_campaign p on p.campaign_id = s.campaign_id
    left join clicks k on k.campaign_id = s.campaign_id
  ),
  unknown_codes as (
    select tc.code_key as code, count(distinct tc.transaction_id) as sales,
           round(coalesce(sum(t.net_in_currency), 0)::numeric, 2) as net
    from tx_codes tc
    join tx_classified t on t.transaction_id = tc.transaction_id
    where t.targets_campaign_product and t.status = 'approved' and t.primary_count <> 1
      and not exists (select 1 from campaigns c where c.code_key = tc.code_key)
    group by tc.code_key
  ),
  totals as (
    select
      count(*) filter (where targets_campaign_product and status = 'approved') as approved_sales,
      count(*) filter (where targets_campaign_product and status = 'approved' and code_count > 0) as tracked_origin_sales,
      count(*) filter (where targets_campaign_product and status = 'approved' and primary_count = 1) as attributed_sales,
      count(*) filter (where not targets_campaign_product and status = 'approved' and match_count = 1) as additional_product_sales,
      count(*) filter (where targets_campaign_product and status = 'approved' and primary_count > 1) as ambiguous_origin_sales,
      count(*) filter (where targets_campaign_product and status <> 'approved') as refunds,
      count(*) filter (where targets_campaign_product and status = 'approved' and is_foreign) as foreign_sales,
      count(*) filter (where targets_campaign_product and status = 'approved' and primary_count = 1 and net_in_currency is null and not is_foreign) as financial_incomplete,
      count(*) filter (where not targets_campaign_product and status = 'approved' and match_count = 1 and net_in_currency is null and not is_foreign) as additional_financial_incomplete,
      round(coalesce(sum(net_in_currency) filter (where targets_campaign_product and status = 'approved' and primary_count = 1), 0)::numeric, 2) as attributed_net,
      round(coalesce(sum(net_in_currency) filter (where not targets_campaign_product and status = 'approved' and match_count = 1), 0)::numeric, 2) as attributed_additional_net
    from tx_classified
  )
  select jsonb_build_object(
    'currency', v_currency,
    'channel', p_channel,
    'campaigns', coalesce((select jsonb_agg(to_jsonb(r) order by r.net + r.additional_net desc, r.sales desc, r.clicks desc) from campaign_rows r), '[]'::jsonb),
    'unknownCodes', coalesce((select jsonb_agg(to_jsonb(u) order by u.sales desc, u.code) from unknown_codes u), '[]'::jsonb),
    'totals', (select to_jsonb(t) from totals t),
    'humanClicks', coalesce((select sum(k.qualified) from clicks k join scope s on s.campaign_id = k.campaign_id), 0)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.ci_campaign_attribution_report(timestamptz, timestamptz, text, text) from public, anon, authenticated;
grant execute on function public.ci_campaign_attribution_report(timestamptz, timestamptz, text, text) to service_role;

-- Catálogo de produtos e contagem de cliques por campanha: antes o ci-campaigns
-- lia a tabela inteira de vendas (1.371 linhas) e de cliques (12.700) pelo
-- PostgREST, que corta em 1.000 e podia ESCONDER um produto do filtro.
create or replace view public.ci_product_catalog
with (security_invoker = true) as
select product_id, max(product_name) as product_name,
       array_remove(array_agg(distinct offer_code order by offer_code), null) as offer_codes
from public.ci_hotmart_transactions
where product_id is not null
group by product_id;

create or replace view public.ci_campaign_click_counts
with (security_invoker = true) as
select campaign_id,
       count(*) filter (where not is_bot) as human_clicks,
       count(*) filter (where traffic_classification = 'qualified') as qualified_clicks,
       max(clicked_at) as last_click_at
from public.ci_click_events
group by campaign_id;

revoke all on public.ci_product_catalog, public.ci_campaign_click_counts from public, anon, authenticated;
grant select on public.ci_product_catalog, public.ci_campaign_click_counts to service_role;
