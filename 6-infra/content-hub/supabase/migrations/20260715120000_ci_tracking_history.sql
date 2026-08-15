begin;

alter table public.ci_click_events
  add column if not exists traffic_classification text not null default 'unknown',
  add column if not exists exclusion_reason text,
  add column if not exists fingerprint_hash text,
  add column if not exists classified_at timestamptz;

alter table public.ci_click_events
  drop constraint if exists ci_click_events_traffic_classification_check;
alter table public.ci_click_events
  add constraint ci_click_events_traffic_classification_check
  check (traffic_classification in ('qualified', 'bot', 'scanner', 'technical', 'duplicate', 'unknown'));

alter table public.ci_click_events
  drop constraint if exists ci_click_events_exclusion_reason_check;
alter table public.ci_click_events
  add constraint ci_click_events_exclusion_reason_check
  check (exclusion_reason is null or char_length(exclusion_reason) <= 160);

alter table public.ci_click_events
  drop constraint if exists ci_click_events_fingerprint_hash_check;
alter table public.ci_click_events
  add constraint ci_click_events_fingerprint_hash_check
  check (fingerprint_hash is null or fingerprint_hash ~ '^[a-f0-9]{64}$');

-- Preserve uncertainty in legacy traffic. A non-bot flag is not proof of a human click.
update public.ci_click_events
set traffic_classification = 'bot',
    exclusion_reason = coalesce(exclusion_reason, 'legacy_bot_flag'),
    classified_at = coalesce(classified_at, clicked_at)
where is_bot = true
  and traffic_classification = 'unknown';

create index if not exists ci_click_events_date_cursor_idx
  on public.ci_click_events(clicked_at desc, click_id desc);
create index if not exists ci_click_events_campaign_date_cursor_idx
  on public.ci_click_events(campaign_id, clicked_at desc, click_id desc);
create index if not exists ci_click_events_traffic_date_idx
  on public.ci_click_events(traffic_classification, clicked_at desc, click_id desc);
create index if not exists ci_click_events_fingerprint_dedupe_idx
  on public.ci_click_events(campaign_id, fingerprint_hash, clicked_at desc)
  where fingerprint_hash is not null;

create table if not exists public.ci_click_ingest_nonces (
  nonce text primary key check (nonce ~ '^[a-f0-9]{32}$'),
  issued_at timestamptz not null,
  claimed_at timestamptz not null default now(),
  expires_at timestamptz not null,
  check (expires_at > issued_at)
);

comment on table public.ci_click_ingest_nonces is
  'Short-lived opaque nonces used to reject replayed Worker-to-Edge click requests. Contains no IP, user agent, URL, or buyer data.';

create index if not exists ci_click_ingest_nonces_expiry_idx
  on public.ci_click_ingest_nonces(expires_at);

alter table public.ci_click_ingest_nonces enable row level security;
revoke all on table public.ci_click_ingest_nonces from anon, authenticated;
grant all on table public.ci_click_ingest_nonces to service_role;

create or replace function public.ci_claim_click_ingest_nonce(
  p_nonce text,
  p_issued_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_inserted bigint := 0;
begin
  if p_nonce is null
    or p_nonce !~ '^[a-f0-9]{32}$'
    or p_issued_at is null
    or p_issued_at < v_now - interval '60 seconds'
    or p_issued_at > v_now + interval '60 seconds'
  then
    return false;
  end if;

  delete from public.ci_click_ingest_nonces
  where expires_at < v_now;

  insert into public.ci_click_ingest_nonces(nonce, issued_at, claimed_at, expires_at)
  values (p_nonce, p_issued_at, v_now, p_issued_at + interval '2 minutes')
  on conflict (nonce) do nothing;
  get diagnostics v_inserted = row_count;

  return v_inserted = 1;
end;
$$;

revoke all on function public.ci_claim_click_ingest_nonce(text, timestamptz) from public, anon, authenticated;
grant execute on function public.ci_claim_click_ingest_nonce(text, timestamptz) to service_role;

create or replace function public.ci_record_campaign_click(
  p_campaign_id uuid,
  p_referrer_host text,
  p_device_type text,
  p_is_bot boolean,
  p_traffic_classification text,
  p_exclusion_reason text,
  p_fingerprint_hash text
)
returns table(
  recorded_click_id bigint,
  recorded_traffic_classification text,
  recorded_exclusion_reason text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clicked_at timestamptz := clock_timestamp();
  v_classification text := p_traffic_classification;
  v_exclusion_reason text := p_exclusion_reason;
begin
  if p_campaign_id is null
    or p_device_type not in ('desktop', 'mobile', 'tablet', 'unknown')
    or p_traffic_classification not in ('qualified', 'bot', 'scanner', 'technical', 'duplicate', 'unknown')
    or p_fingerprint_hash is null
    or p_fingerprint_hash !~ '^[a-f0-9]{64}$'
    or (p_referrer_host is not null and char_length(p_referrer_host) > 255)
    or (p_exclusion_reason is not null and char_length(p_exclusion_reason) > 160)
  then
    raise exception 'invalid click event';
  end if;

  if v_classification in ('qualified', 'unknown') then
    -- Serialize the rolling-window decision for this campaign/fingerprint so
    -- concurrent requests cannot both be classified as the first click.
    perform pg_advisory_xact_lock(
      hashtextextended(p_campaign_id::text || ':' || p_fingerprint_hash, 0)
    );
    if exists (
      select 1
      from public.ci_click_events previous
      where previous.campaign_id = p_campaign_id
        and previous.fingerprint_hash = p_fingerprint_hash
        and previous.clicked_at >= v_clicked_at - interval '30 seconds'
        and previous.clicked_at <= v_clicked_at
    ) then
      v_classification := 'duplicate';
      v_exclusion_reason := 'same_fingerprint_within_30s';
    end if;
  end if;

  return query
  insert into public.ci_click_events(
    campaign_id,
    clicked_at,
    referrer_host,
    device_type,
    is_bot,
    traffic_classification,
    exclusion_reason,
    fingerprint_hash,
    classified_at
  ) values (
    p_campaign_id,
    v_clicked_at,
    p_referrer_host,
    p_device_type,
    p_is_bot,
    v_classification,
    v_exclusion_reason,
    p_fingerprint_hash,
    v_clicked_at
  )
  returning
    ci_click_events.click_id,
    ci_click_events.traffic_classification,
    ci_click_events.exclusion_reason;
end;
$$;

revoke all on function public.ci_record_campaign_click(uuid, text, text, boolean, text, text, text)
  from public, anon, authenticated;
grant execute on function public.ci_record_campaign_click(uuid, text, text, boolean, text, text, text)
  to service_role;

create index if not exists ci_campaigns_video_position_idx
  on public.ci_campaigns(video_id, cta_position, campaign_id);
create index if not exists ci_hotmart_transactions_approved_cursor_idx
  on public.ci_hotmart_transactions(approved_date desc, transaction_id desc)
  where approved_date is not null;

create table if not exists public.ci_operational_events (
  event_id bigint generated always as identity primary key,
  event_type text not null
    check (event_type ~ '^[a-z][a-z0-9_]{2,80}$'),
  severity text not null
    check (severity in ('info', 'warning', 'error')),
  occurred_at timestamptz not null default now(),
  details jsonb not null default '{}'::jsonb
    check (jsonb_typeof(details) = 'object')
    check (octet_length(details::text) <= 4096),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  check (resolved_at is null or resolved_at >= occurred_at)
);

comment on table public.ci_operational_events is
  'Sanitized operational failures and warnings only. Never store buyer data, IP addresses, raw user agents, tokens, URLs with query strings, or request bodies.';
comment on column public.ci_click_events.fingerprint_hash is
  'One-way HMAC/SHA-256 fingerprint. Never store its raw identifying inputs.';

create index if not exists ci_operational_events_type_date_idx
  on public.ci_operational_events(event_type, occurred_at desc, event_id desc);
create index if not exists ci_operational_events_unresolved_idx
  on public.ci_operational_events(severity, occurred_at desc, event_id desc)
  where resolved_at is null;

alter table public.ci_operational_events enable row level security;
revoke all on table public.ci_operational_events from anon, authenticated;
grant all on table public.ci_operational_events to service_role;
grant usage, select on sequence public.ci_operational_events_event_id_seq to service_role;

create or replace function public.ci_tracking_freshness()
returns table(
  last_click_at timestamptz,
  last_qualified_click_at timestamptz,
  last_hotmart_webhook_at timestamptz,
  last_hotmart_reconciliation_at timestamptz,
  last_hotmart_reconciliation_attempt_at timestamptz,
  last_hotmart_reconciliation_success_at timestamptz,
  last_hotmart_reconciliation_partial_at timestamptz,
  last_hotmart_reconciliation_status text,
  last_hotmart_reconciliation_warnings jsonb,
  last_hotmart_reconciliation_error_code text,
  last_hotmart_reconciliation_error_message text,
  hotmart_schedule_active boolean,
  hotmart_schedule_expression text,
  latest_operational_failure_at timestamptz,
  unresolved_operational_failures bigint
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_schedule_active boolean := false;
  v_schedule_expression text := null;
  v_last_reconciliation_attempt_at timestamptz := null;
  v_last_reconciliation_status text := null;
  v_last_reconciliation_warnings jsonb := '[]'::jsonb;
  v_last_reconciliation_error_code text := null;
  v_last_reconciliation_error_message text := null;
begin
  -- pg_cron may not be installed yet when this migration is applied. Dynamic
  -- SQL keeps the function valid and reports the real job state once enabled.
  if to_regclass('cron.job') is not null then
    execute $schedule$
      select
        coalesce(bool_or(active), false),
        max(schedule) filter (where active)
      from cron.job
      where jobname = $1
    $schedule$
    into v_schedule_active, v_schedule_expression
    using 'ci-hotmart-daily';
  end if;

  select
    runs.started_at,
    runs.status,
    runs.warnings,
    runs.error_code,
    runs.error_message
  into
    v_last_reconciliation_attempt_at,
    v_last_reconciliation_status,
    v_last_reconciliation_warnings,
    v_last_reconciliation_error_code,
    v_last_reconciliation_error_message
  from public.ci_sync_runs runs
  where runs.source = 'hotmart_reconciliation'
  order by runs.started_at desc, runs.run_id desc
  limit 1;

  return query
  select
    (select max(clicks.clicked_at)
      from public.ci_click_events clicks
      join public.ci_campaigns campaigns on campaigns.campaign_id = clicks.campaign_id
      where campaigns.product_id = '6966825'
        and campaigns.cta_position in ('description', 'pinned_comment', 'comment_reply', 'video')),
    (select max(clicks.clicked_at)
      from public.ci_click_events clicks
      join public.ci_campaigns campaigns on campaigns.campaign_id = clicks.campaign_id
      where campaigns.product_id = '6966825'
        and campaigns.cta_position in ('description', 'pinned_comment', 'comment_reply', 'video')
        and clicks.traffic_classification = 'qualified'),
    (select max(received_at) from public.ci_hotmart_events where source = 'webhook'),
    -- Backward-compatible field: a partial attempt is not a successful refresh.
    (select max(finished_at) from public.ci_sync_runs
      where source = 'hotmart_reconciliation' and status = 'success'),
    v_last_reconciliation_attempt_at,
    (select max(finished_at) from public.ci_sync_runs
      where source = 'hotmart_reconciliation' and status = 'success'),
    (select max(finished_at) from public.ci_sync_runs
      where source = 'hotmart_reconciliation' and status = 'partial'),
    v_last_reconciliation_status,
    coalesce(v_last_reconciliation_warnings, '[]'::jsonb),
    v_last_reconciliation_error_code,
    v_last_reconciliation_error_message,
    v_schedule_active,
    v_schedule_expression,
    (select max(occurred_at) from public.ci_operational_events
      where severity in ('warning', 'error') and resolved_at is null),
    (select count(*) from public.ci_operational_events
      where severity in ('warning', 'error') and resolved_at is null);
end;
$$;

create or replace function public.ci_tracking_series(
  p_start timestamptz,
  p_end timestamptz,
  p_granularity text default 'day',
  p_video_id text default null,
  p_position text default null,
  p_traffic text default 'all'
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

  return query
  with scope_campaigns as (
    select campaigns.*
    from public.ci_campaigns campaigns
    where campaigns.product_id = '6966825'
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
            transactions.product_id = '6966825'
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
  p_limit integer default 51
)
returns table(
  event_id text,
  event_sort_id text,
  event_type text,
  occurred_at timestamptz,
  campaign_id uuid,
  video_id text,
  video_title text,
  thumbnail_url text,
  cta_position text,
  tracking_code text,
  traffic_classification text,
  traffic_group text,
  referrer_host text,
  device_type text,
  exclusion_reason text,
  attribution text,
  transaction_status text,
  amount numeric,
  currency text,
  product_name text
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
  if p_position is not null and p_position not in ('description', 'pinned_comment', 'comment_reply', 'video') then
    raise exception 'invalid tracking position' using errcode = '22023';
  end if;
  if p_traffic not in ('qualified', 'technical', 'all') then
    raise exception 'invalid tracking traffic' using errcode = '22023';
  end if;
  if not p_include_clicks and not p_include_sales then
    raise exception 'at least one tracking event type is required' using errcode = '22023';
  end if;

  return query
  with scope_campaigns as (
    select campaigns.*
    from public.ci_campaigns campaigns
    where campaigns.product_id = '6966825'
      and campaigns.cta_position in ('description', 'pinned_comment', 'comment_reply', 'video')
  ),
  transaction_codes as (
    select distinct
      t.transaction_id,
      lower(btrim(code)) as origin_code
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
      on lower(btrim(campaigns.tracking_code)) = origins.origin_code
    group by origins.transaction_id
  ),
  transaction_matches as (
    select
      origins.transaction_id,
      count(distinct campaigns.campaign_id) as match_count,
      min(campaigns.campaign_id::text)::uuid as matched_campaign_id
    from transaction_codes origins
    join scope_campaigns campaigns
      on lower(btrim(campaigns.tracking_code)) = origins.origin_code
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
      campaigns.product_name as row_product_name
    from public.ci_click_events clicks
    join scope_campaigns campaigns on campaigns.campaign_id = clicks.campaign_id
    left join public.ci_youtube_videos videos on videos.video_id = campaigns.video_id
    where p_include_clicks
      and clicks.clicked_at >= p_start
      and clicks.clicked_at < p_end
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
          or (
            transactions.product_id is null
            and transactions.offer_code is not null
            and campaigns.offer_code = transactions.offer_code
          ) then 'direct_primary'
        else 'direct_additional'
      end as row_attribution,
      transactions.status as row_transaction_status,
      case
        when upper(coalesce(transactions.producer_net_currency, '')) = 'BRL'
          and transactions.producer_net_value is not null
          then transactions.producer_net_value
        when upper(coalesce(transactions.gross_currency, '')) = 'BRL'
          and upper(coalesce(transactions.fee_currency, '')) = 'BRL'
          and transactions.gross_value is not null
          and transactions.fee_value is not null
          then transactions.gross_value - transactions.fee_value
        else null
      end as row_amount,
      case
        when upper(coalesce(transactions.producer_net_currency, '')) = 'BRL'
          and transactions.producer_net_value is not null then 'BRL'
        when upper(coalesce(transactions.gross_currency, '')) = 'BRL'
          and upper(coalesce(transactions.fee_currency, '')) = 'BRL'
          and transactions.gross_value is not null
          and transactions.fee_value is not null then 'BRL'
        else null
      end as row_currency,
      transactions.product_name as row_product_name
    from public.ci_hotmart_transactions transactions
    left join transaction_matches matches on matches.transaction_id = transactions.transaction_id
    left join all_transaction_matches all_matches on all_matches.transaction_id = transactions.transaction_id
    left join scope_campaigns campaigns
      on matches.match_count = 1 and campaigns.campaign_id = matches.matched_campaign_id
    left join public.ci_youtube_videos videos on videos.video_id = campaigns.video_id
    where p_include_sales
      and transactions.approved_date >= p_start
      and transactions.approved_date < p_end
      and (
        coalesce(matches.match_count, 0) > 0
        or (
          coalesce(all_matches.match_count, 0) = 0
          and (
            transactions.product_id = '6966825'
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
  )
  select
    candidates.row_event_id,
    candidates.row_sort_id,
    candidates.row_event_type,
    candidates.row_occurred_at,
    candidates.row_campaign_id,
    candidates.row_video_id,
    candidates.row_video_title,
    candidates.row_thumbnail_url,
    candidates.row_position,
    candidates.row_tracking_code,
    candidates.row_traffic_classification,
    candidates.row_traffic_group,
    candidates.row_referrer_host,
    candidates.row_device_type,
    candidates.row_exclusion_reason,
    candidates.row_attribution,
    candidates.row_transaction_status,
    candidates.row_amount,
    candidates.row_currency,
    candidates.row_product_name
  from candidate_events candidates
  where p_cursor_at is null
     or candidates.row_occurred_at < p_cursor_at
     or (candidates.row_occurred_at = p_cursor_at and candidates.row_sort_id < p_cursor_id)
  order by candidates.row_occurred_at desc, candidates.row_sort_id desc
  limit least(greatest(p_limit, 1), 101);
end;
$$;

revoke all on function public.ci_tracking_freshness() from public, anon, authenticated;
revoke all on function public.ci_tracking_series(timestamptz, timestamptz, text, text, text, text) from public, anon, authenticated;
revoke all on function public.ci_tracking_events(timestamptz, timestamptz, text, text, text, boolean, boolean, timestamptz, text, integer) from public, anon, authenticated;
grant execute on function public.ci_tracking_freshness() to service_role;
grant execute on function public.ci_tracking_series(timestamptz, timestamptz, text, text, text, text) to service_role;
grant execute on function public.ci_tracking_events(timestamptz, timestamptz, text, text, text, boolean, boolean, timestamptz, text, integer) to service_role;

commit;
