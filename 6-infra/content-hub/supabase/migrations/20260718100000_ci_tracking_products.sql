-- Filtro de produto na série de rastreamento + estatísticas agregadas por vídeo.
-- 1) ci_tracking_series ganha p_products (text[]): null = todos os produtos com campanha
--    (comportamento idêntico ao anterior enquanto só existem campanhas do MAPA-7P);
--    array = restringe campanhas e vendas aos produtos informados.
-- 2) View ci_youtube_video_stats: soma de views/likes/comments por vídeo (pro catálogo ordenável).

drop function if exists public.ci_tracking_series(timestamptz, timestamptz, text, text, text, text);

create function public.ci_tracking_series(
  p_start timestamptz,
  p_end timestamptz,
  p_granularity text default 'day',
  p_video_id text default null,
  p_position text default null,
  p_traffic text default 'all',
  p_products text[] default null
)
returns table(
  bucket_start timestamptz,
  event_type text,
  cta_position text,
  traffic_group text,
  attribution text,
  event_count bigint,
  financial_incomplete boolean,
  net_amount numeric
)
language plpgsql
stable
security invoker
set search_path = public, pg_temp
as $$
begin
  if p_start is null or p_end is null or p_start >= p_end then
    raise exception 'invalid tracking period' using errcode = '22023';
  end if;
  if p_end - p_start > interval '366 days' then
    raise exception 'tracking period exceeds 366 days' using errcode = '22023';
  end if;
  if p_granularity not in ('hour', 'day', 'week') then
    raise exception 'invalid tracking granularity' using errcode = '22023';
  end if;
  if p_position is not null and p_position not in ('description', 'pinned_comment', 'comment_reply', 'video') then
    raise exception 'invalid tracking position' using errcode = '22023';
  end if;
  if p_traffic not in ('qualified', 'technical', 'all') then
    raise exception 'invalid tracking traffic' using errcode = '22023';
  end if;
  if p_products is not null and coalesce(array_length(p_products, 1), 0) = 0 then
    p_products := null;
  end if;

  return query
  with scope_campaigns as (
    select campaigns.*
    from public.ci_campaigns campaigns
    where (p_products is null or campaigns.product_id = any(p_products))
      and campaigns.cta_position in ('description', 'pinned_comment', 'comment_reply', 'video')
  ),
  transaction_codes as (
    select distinct
      t.transaction_id,
      lower(btrim(code)) as tracking_code
    from public.ci_hotmart_transactions t
    cross join lateral unnest(array[t.tracking_sck, t.tracking_src, t.tracking_xcod]) as origin(code)
    where t.approved_date >= p_start
      and t.approved_date < p_end
      and code is not null
      and btrim(code) <> ''
  ),
  all_transaction_matches as (
    select
      origins.transaction_id,
      count(distinct campaigns.campaign_id) as match_count
    from transaction_codes origins
    join public.ci_campaigns campaigns
      on lower(btrim(campaigns.tracking_code)) = origins.tracking_code
    group by origins.transaction_id
  ),
  transaction_matches as (
    select
      origins.transaction_id,
      count(distinct campaigns.campaign_id) as match_count,
      min(campaigns.campaign_id::text)::uuid as campaign_id
    from transaction_codes origins
    join scope_campaigns campaigns
      on lower(btrim(campaigns.tracking_code)) = origins.tracking_code
    group by origins.transaction_id
  ),
  click_rows as (
    select
      case p_granularity
        when 'hour' then date_trunc('hour', clicks.clicked_at at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo'
        when 'week' then date_trunc('week', clicks.clicked_at at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo'
        else date_trunc('day', clicks.clicked_at at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo'
      end as local_bucket,
      'click'::text as row_type,
      campaigns.cta_position as row_position,
      case
        when clicks.traffic_classification = 'qualified' then 'qualified'
        when clicks.traffic_classification in ('bot', 'scanner', 'technical', 'duplicate') then 'technical'
        else 'unknown'
      end as row_traffic,
      null::text as row_attribution,
      1::bigint as row_count,
      false as row_financial_incomplete,
      0::numeric as row_net
    from public.ci_click_events clicks
    join scope_campaigns campaigns on campaigns.campaign_id = clicks.campaign_id
    where clicks.clicked_at >= p_start
      and clicks.clicked_at < p_end
      and (p_video_id is null or campaigns.video_id = p_video_id)
      and (p_position is null or campaigns.cta_position = p_position)
      and (
        p_traffic = 'all'
        or (p_traffic = 'qualified' and clicks.traffic_classification = 'qualified')
        or (p_traffic = 'technical' and clicks.traffic_classification in ('bot', 'scanner', 'technical', 'duplicate'))
      )
  ),
  sale_rows as (
    select
      case p_granularity
        when 'hour' then date_trunc('hour', transactions.approved_date at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo'
        when 'week' then date_trunc('week', transactions.approved_date at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo'
        else date_trunc('day', transactions.approved_date at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo'
      end as local_bucket,
      'sale'::text as row_type,
      case
        when matches.match_count = 1 and all_matches.match_count = 1 then campaigns.cta_position
        else null
      end as row_position,
      null::text as row_traffic,
      case
        when coalesce(matches.match_count, 0) = 0 then 'unattributed'
        when matches.match_count > 1 or all_matches.match_count > 1 then 'ambiguous'
        when transactions.product_id = campaigns.product_id
          or (
            transactions.product_id is null
            and transactions.offer_code is not null
            and campaigns.offer_code = transactions.offer_code
          ) then 'direct_primary'
        else 'direct_additional'
      end as row_attribution,
      1::bigint as row_count,
      case
        when upper(coalesce(transactions.producer_net_currency, '')) = 'BRL'
          and transactions.producer_net_value is not null
          then false
        when upper(coalesce(transactions.gross_currency, '')) = 'BRL'
          and upper(coalesce(transactions.fee_currency, '')) = 'BRL'
          and transactions.gross_value is not null
          and transactions.fee_value is not null
          then false
        else true
      end as row_financial_incomplete,
      case
        when upper(coalesce(transactions.producer_net_currency, '')) = 'BRL'
          and transactions.producer_net_value is not null
          then transactions.producer_net_value
        when upper(coalesce(transactions.gross_currency, '')) = 'BRL'
          and upper(coalesce(transactions.fee_currency, '')) = 'BRL'
          and transactions.gross_value is not null
          and transactions.fee_value is not null
          then transactions.gross_value - transactions.fee_value
        else 0::numeric
      end as row_net
    from public.ci_hotmart_transactions transactions
    left join transaction_matches matches on matches.transaction_id = transactions.transaction_id
    left join all_transaction_matches all_matches on all_matches.transaction_id = transactions.transaction_id
    left join scope_campaigns campaigns
      on matches.match_count = 1 and campaigns.campaign_id = matches.campaign_id
    where transactions.approved_date >= p_start
      and transactions.approved_date < p_end
      and transactions.status = 'approved'
      and (
        coalesce(matches.match_count, 0) > 0
        or (
          coalesce(all_matches.match_count, 0) = 0
          and (
            (
              p_products is null
              and exists (
                select 1
                from scope_campaigns product_campaign
                where product_campaign.product_id = transactions.product_id
              )
            )
            or (p_products is not null and transactions.product_id = any(p_products))
            or (
              transactions.product_id is null
              and transactions.offer_code is not null
              and exists (
                select 1
                from scope_campaigns product_campaign
                where product_campaign.offer_code = transactions.offer_code
              )
            )
          )
        )
      )
      and (
        (p_video_id is null and p_position is null)
        or (
          matches.match_count = 1
          and all_matches.match_count = 1
          and (p_video_id is null or campaigns.video_id = p_video_id)
          and (p_position is null or campaigns.cta_position = p_position)
        )
      )
  ),
  combined as (
    select * from click_rows
    union all
    select * from sale_rows
  )
  select
    combined.local_bucket,
    combined.row_type,
    combined.row_position,
    combined.row_traffic,
    combined.row_attribution,
    sum(combined.row_count)::bigint,
    combined.row_financial_incomplete,
    sum(combined.row_net)::numeric
  from combined
  group by
    combined.local_bucket,
    combined.row_type,
    combined.row_position,
    combined.row_traffic,
    combined.row_attribution,
    combined.row_financial_incomplete
  order by combined.local_bucket asc, combined.row_type, combined.row_position nulls last;
end;
$$;

revoke all on function public.ci_tracking_series(timestamptz, timestamptz, text, text, text, text, text[]) from public, anon, authenticated;
grant execute on function public.ci_tracking_series(timestamptz, timestamptz, text, text, text, text, text[]) to service_role;

create or replace view public.ci_youtube_video_stats
with (security_invoker = true) as
select
  daily.video_id,
  coalesce(sum(daily.views), 0)::bigint as views,
  coalesce(sum(daily.likes), 0)::bigint as likes,
  coalesce(sum(daily.comments), 0)::bigint as comments
from public.ci_youtube_daily daily
group by daily.video_id;

revoke all on public.ci_youtube_video_stats from public, anon, authenticated;
grant select on public.ci_youtube_video_stats to service_role;
