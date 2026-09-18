-- Etapa 3 da faxina (18/09/2026): com filtro de canal, venda sem origem sai.
--
-- Com p_channel = 'instagram' o livro-caixa e a série continuavam trazendo as
-- vendas do MAPA SEM código (unattributed), porque a regra "produto tem
-- campanha no escopo" olhava só o produto. Venda sem origem não pertence a
-- canal nenhum: só aparece quando o filtro de canal está em "todos", igual ao
-- que já acontecia com vídeo e local. Corpo idêntico ao da migração
-- 20260918214000, mudando só essa guarda nas duas funções.
-- Aplicada em produção em 18/09/2026 via MCP.

drop function if exists public.ci_tracking_series(timestamptz, timestamptz, text, text, text, text, text[]);

create or replace function public.ci_tracking_series(
  p_start timestamptz,
  p_end timestamptz,
  p_granularity text default 'day',
  p_video_id text default null,
  p_position text default null,
  p_traffic text default 'all',
  p_products text[] default null,
  p_channel text default null
)
returns table(
  bucket_start timestamptz,
  event_type text,
  cta_position text,
  traffic_group text,
  attribution text,
  event_count bigint,
  financial_incomplete boolean,
  net_amount numeric,
  channel text
)
language plpgsql
stable
set search_path to 'public', 'pg_temp'
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
  if p_position is not null and p_position not in ('description', 'pinned_comment', 'comment_reply', 'video', 'bio', 'dm', 'community', 'other') then
    raise exception 'invalid tracking position' using errcode = '22023';
  end if;
  if p_traffic not in ('qualified', 'technical', 'all') then
    raise exception 'invalid tracking traffic' using errcode = '22023';
  end if;
  if p_channel is not null and p_channel not in ('youtube', 'instagram') then
    raise exception 'invalid tracking channel' using errcode = '22023';
  end if;
  if p_products is not null and coalesce(array_length(p_products, 1), 0) = 0 then
    p_products := null;
  end if;

  return query
  with scope_campaigns as (
    select campaigns.*
    from public.ci_campaigns campaigns
    where (p_products is null or campaigns.product_id = any(p_products))
      and (p_channel is null or campaigns.channel = p_channel)
  ),
  transaction_codes as (
    select distinct t.transaction_id, lower(btrim(code)) as tracking_code
    from public.ci_hotmart_transactions t
    cross join lateral unnest(array[t.tracking_sck, t.tracking_src, t.tracking_xcod]) as origin(code)
    where t.approved_date >= p_start and t.approved_date < p_end
      and code is not null and btrim(code) <> ''
  ),
  all_transaction_matches as (
    select origins.transaction_id, count(distinct campaigns.campaign_id) as match_count
    from transaction_codes origins
    join public.ci_campaigns campaigns on lower(btrim(campaigns.tracking_code)) = origins.tracking_code
    group by origins.transaction_id
  ),
  transaction_matches as (
    select origins.transaction_id, count(distinct campaigns.campaign_id) as match_count,
           min(campaigns.campaign_id::text)::uuid as campaign_id
    from transaction_codes origins
    join scope_campaigns campaigns on lower(btrim(campaigns.tracking_code)) = origins.tracking_code
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
      0::numeric as row_net,
      campaigns.channel as row_channel
    from public.ci_click_events clicks
    join scope_campaigns campaigns on campaigns.campaign_id = clicks.campaign_id
    where clicks.clicked_at >= p_start and clicks.clicked_at < p_end
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
      case when matches.match_count = 1 and all_matches.match_count = 1 then campaigns.cta_position else null end as row_position,
      null::text as row_traffic,
      case
        when coalesce(matches.match_count, 0) = 0 then 'unattributed'
        when matches.match_count > 1 or all_matches.match_count > 1 then 'ambiguous'
        when transactions.product_id = campaigns.product_id
          or (transactions.product_id is null and transactions.offer_code is not null and campaigns.offer_code = transactions.offer_code)
          then 'direct_primary'
        else 'direct_additional'
      end as row_attribution,
      1::bigint as row_count,
      case
        when upper(coalesce(transactions.producer_net_currency, '')) = 'BRL' and transactions.producer_net_value is not null then false
        when upper(coalesce(transactions.gross_currency, '')) = 'BRL' and upper(coalesce(transactions.fee_currency, '')) = 'BRL'
             and transactions.gross_value is not null and transactions.fee_value is not null then false
        else true
      end as row_financial_incomplete,
      case
        when upper(coalesce(transactions.producer_net_currency, '')) = 'BRL' and transactions.producer_net_value is not null then transactions.producer_net_value
        when upper(coalesce(transactions.gross_currency, '')) = 'BRL' and upper(coalesce(transactions.fee_currency, '')) = 'BRL'
             and transactions.gross_value is not null and transactions.fee_value is not null then transactions.gross_value - transactions.fee_value
        else 0::numeric
      end as row_net,
      case when matches.match_count = 1 and all_matches.match_count = 1 then campaigns.channel else null end as row_channel
    from public.ci_hotmart_transactions transactions
    left join transaction_matches matches on matches.transaction_id = transactions.transaction_id
    left join all_transaction_matches all_matches on all_matches.transaction_id = transactions.transaction_id
    left join scope_campaigns campaigns on matches.match_count = 1 and campaigns.campaign_id = matches.campaign_id
    where transactions.approved_date >= p_start and transactions.approved_date < p_end
      and transactions.status = 'approved'
      and (
        coalesce(matches.match_count, 0) > 0
        or (
          coalesce(all_matches.match_count, 0) = 0
          and (
            (p_products is null and exists (select 1 from scope_campaigns product_campaign where product_campaign.product_id = transactions.product_id))
            or (p_products is not null and transactions.product_id = any(p_products))
            or (transactions.product_id is null and transactions.offer_code is not null
                and exists (select 1 from scope_campaigns product_campaign where product_campaign.offer_code = transactions.offer_code))
          )
        )
      )
      and (
        (p_video_id is null and p_position is null and p_channel is null)
        or (
          matches.match_count = 1 and all_matches.match_count = 1
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
  select combined.local_bucket, combined.row_type, combined.row_position, combined.row_traffic, combined.row_attribution,
         sum(combined.row_count)::bigint, combined.row_financial_incomplete, sum(combined.row_net)::numeric, combined.row_channel
  from combined
  group by combined.local_bucket, combined.row_type, combined.row_position, combined.row_traffic, combined.row_attribution,
           combined.row_financial_incomplete, combined.row_channel
  order by combined.local_bucket asc, combined.row_type, combined.row_position nulls last;
end;
$$;

revoke all on function public.ci_tracking_series(timestamptz, timestamptz, text, text, text, text, text[], text) from public, anon, authenticated;
grant execute on function public.ci_tracking_series(timestamptz, timestamptz, text, text, text, text, text[], text) to service_role;

drop function if exists public.ci_tracking_events(timestamptz, timestamptz, text, text, text, boolean, boolean, timestamptz, text, integer);

create or replace function public.ci_tracking_events(
  p_start timestamptz,
  p_end timestamptz,
  p_video_id text default null,
  p_position text default null,
  p_traffic text default 'all',
  p_include_clicks boolean default true,
  p_include_sales boolean default true,
  p_cursor_at timestamptz default null,
  p_cursor_id text default null,
  p_limit integer default 51,
  p_channel text default null
)
returns table(
  event_id text, event_sort_id text, event_type text, occurred_at timestamptz, campaign_id uuid,
  video_id text, video_title text, thumbnail_url text, cta_position text, tracking_code text,
  traffic_classification text, traffic_group text, referrer_host text, device_type text, exclusion_reason text,
  attribution text, transaction_status text, amount numeric, currency text, product_name text,
  channel text, campaign_name text
)
language plpgsql
stable
set search_path to 'public', 'pg_temp'
as $$
begin
  if p_start is null or p_end is null or p_start >= p_end then
    raise exception 'invalid tracking period' using errcode = '22023';
  end if;
  if p_end - p_start > interval '366 days' then
    raise exception 'tracking period exceeds 366 days' using errcode = '22023';
  end if;
  if p_position is not null and p_position not in ('description', 'pinned_comment', 'comment_reply', 'video', 'bio', 'dm', 'community', 'other') then
    raise exception 'invalid tracking position' using errcode = '22023';
  end if;
  if p_traffic not in ('qualified', 'technical', 'all') then
    raise exception 'invalid tracking traffic' using errcode = '22023';
  end if;
  if p_channel is not null and p_channel not in ('youtube', 'instagram') then
    raise exception 'invalid tracking channel' using errcode = '22023';
  end if;
  if not p_include_clicks and not p_include_sales then
    raise exception 'at least one tracking event type is required' using errcode = '22023';
  end if;

  return query
  with scope_campaigns as (
    select campaigns.*
    from public.ci_campaigns campaigns
    where (p_channel is null or campaigns.channel = p_channel)
  ),
  transaction_codes as (
    select distinct t.transaction_id, lower(btrim(code)) as origin_code
    from public.ci_hotmart_transactions t
    cross join lateral unnest(array[t.tracking_sck, t.tracking_src, t.tracking_xcod]) as origin(code)
    where t.approved_date >= p_start and t.approved_date < p_end
      and code is not null and btrim(code) <> ''
  ),
  all_transaction_matches as (
    select origins.transaction_id, count(distinct campaigns.campaign_id) as match_count
    from transaction_codes origins
    join public.ci_campaigns campaigns on lower(btrim(campaigns.tracking_code)) = origins.origin_code
    group by origins.transaction_id
  ),
  transaction_matches as (
    select origins.transaction_id, count(distinct campaigns.campaign_id) as match_count,
           min(campaigns.campaign_id::text)::uuid as matched_campaign_id
    from transaction_codes origins
    join scope_campaigns campaigns on lower(btrim(campaigns.tracking_code)) = origins.origin_code
    group by origins.transaction_id
  ),
  candidate_events as (
    select
      'click:' || clicks.click_id::text as row_event_id,
      'c:' || lpad(clicks.click_id::text, 20, '0') as row_sort_id,
      'click'::text as row_event_type,
      clicks.clicked_at as row_occurred_at,
      campaigns.campaign_id as row_campaign_id,
      campaigns.video_id as row_video_id,
      videos.title as row_video_title,
      videos.thumbnail_url as row_thumbnail_url,
      campaigns.cta_position as row_position,
      campaigns.tracking_code as row_tracking_code,
      clicks.traffic_classification as row_traffic_classification,
      case
        when clicks.traffic_classification = 'qualified' then 'qualified'
        when clicks.traffic_classification in ('bot', 'scanner', 'technical', 'duplicate') then 'technical'
        else 'unknown'
      end as row_traffic_group,
      clicks.referrer_host as row_referrer_host,
      clicks.device_type as row_device_type,
      clicks.exclusion_reason as row_exclusion_reason,
      null::text as row_attribution,
      null::text as row_transaction_status,
      null::numeric as row_amount,
      null::text as row_currency,
      campaigns.product_name as row_product_name,
      campaigns.channel as row_channel,
      campaigns.name as row_campaign_name
    from public.ci_click_events clicks
    join scope_campaigns campaigns on campaigns.campaign_id = clicks.campaign_id
    left join public.ci_youtube_videos videos on videos.video_id = campaigns.video_id
    where p_include_clicks
      and clicks.clicked_at >= p_start and clicks.clicked_at < p_end
      and (p_video_id is null or campaigns.video_id = p_video_id)
      and (p_position is null or campaigns.cta_position = p_position)
      and (
        p_traffic = 'all'
        or (p_traffic = 'qualified' and clicks.traffic_classification = 'qualified')
        or (p_traffic = 'technical' and clicks.traffic_classification in ('bot', 'scanner', 'technical', 'duplicate'))
      )
    union all
    select
      'sale:' || md5('ci-sale:' || transactions.transaction_id) as row_event_id,
      's:' || md5('ci-sale:' || transactions.transaction_id) as row_sort_id,
      'sale'::text as row_event_type,
      transactions.approved_date as row_occurred_at,
      case when matches.match_count = 1 and all_matches.match_count = 1 then campaigns.campaign_id else null end as row_campaign_id,
      case when matches.match_count = 1 and all_matches.match_count = 1 then campaigns.video_id else null end as row_video_id,
      case when matches.match_count = 1 and all_matches.match_count = 1 then videos.title else null end as row_video_title,
      case when matches.match_count = 1 and all_matches.match_count = 1 then videos.thumbnail_url else null end as row_thumbnail_url,
      case when matches.match_count = 1 and all_matches.match_count = 1 then campaigns.cta_position else null end as row_position,
      case when matches.match_count = 1 and all_matches.match_count = 1 then campaigns.tracking_code else null end as row_tracking_code,
      null::text as row_traffic_classification,
      null::text as row_traffic_group,
      null::text as row_referrer_host,
      null::text as row_device_type,
      null::text as row_exclusion_reason,
      case
        when coalesce(matches.match_count, 0) = 0 then 'unattributed'
        when matches.match_count > 1 or all_matches.match_count > 1 then 'ambiguous'
        when transactions.product_id = campaigns.product_id
          or (transactions.product_id is null and transactions.offer_code is not null and campaigns.offer_code = transactions.offer_code)
          then 'direct_primary'
        else 'direct_additional'
      end as row_attribution,
      transactions.status as row_transaction_status,
      -- valor na moeda em que o comprador pagou (o painel mostra a moeda ao lado)
      coalesce(transactions.producer_net_value, transactions.gross_value) as row_amount,
      upper(coalesce(transactions.producer_net_currency, transactions.gross_currency)) as row_currency,
      transactions.product_name as row_product_name,
      case when matches.match_count = 1 and all_matches.match_count = 1 then campaigns.channel else null end as row_channel,
      case when matches.match_count = 1 and all_matches.match_count = 1 then campaigns.name else null end as row_campaign_name
    from public.ci_hotmart_transactions transactions
    left join transaction_matches matches on matches.transaction_id = transactions.transaction_id
    left join all_transaction_matches all_matches on all_matches.transaction_id = transactions.transaction_id
    left join scope_campaigns campaigns on matches.match_count = 1 and campaigns.campaign_id = matches.matched_campaign_id
    left join public.ci_youtube_videos videos on videos.video_id = campaigns.video_id
    where p_include_sales
      and transactions.approved_date >= p_start and transactions.approved_date < p_end
      and (
        coalesce(matches.match_count, 0) > 0
        or (
          coalesce(all_matches.match_count, 0) = 0
          and (
            exists (select 1 from scope_campaigns product_campaign where product_campaign.product_id = transactions.product_id)
            or (transactions.product_id is null and transactions.offer_code is not null
                and exists (select 1 from scope_campaigns product_campaign where product_campaign.offer_code = transactions.offer_code))
          )
        )
      )
      and (
        (p_video_id is null and p_position is null and p_channel is null)
        or (
          matches.match_count = 1 and all_matches.match_count = 1
          and (p_video_id is null or campaigns.video_id = p_video_id)
          and (p_position is null or campaigns.cta_position = p_position)
        )
      )
  )
  select
    candidates.row_event_id, candidates.row_sort_id, candidates.row_event_type, candidates.row_occurred_at, candidates.row_campaign_id,
    candidates.row_video_id, candidates.row_video_title, candidates.row_thumbnail_url, candidates.row_position, candidates.row_tracking_code,
    candidates.row_traffic_classification, candidates.row_traffic_group, candidates.row_referrer_host, candidates.row_device_type, candidates.row_exclusion_reason,
    candidates.row_attribution, candidates.row_transaction_status, candidates.row_amount, candidates.row_currency, candidates.row_product_name,
    candidates.row_channel, candidates.row_campaign_name
  from candidate_events candidates
  where p_cursor_at is null
     or candidates.row_occurred_at < p_cursor_at
     or (candidates.row_occurred_at = p_cursor_at and candidates.row_sort_id < p_cursor_id)
  order by candidates.row_occurred_at desc, candidates.row_sort_id desc
  limit least(greatest(p_limit, 1), 101);
end;
$$;

revoke all on function public.ci_tracking_events(timestamptz, timestamptz, text, text, text, boolean, boolean, timestamptz, text, integer, text) from public, anon, authenticated;
grant execute on function public.ci_tracking_events(timestamptz, timestamptz, text, text, text, boolean, boolean, timestamptz, text, integer, text) to service_role;
