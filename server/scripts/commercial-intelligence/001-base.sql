begin;

create extension if not exists pgcrypto;

create table if not exists public.ci_youtube_videos (
  video_id text primary key,
  title text not null,
  published_at timestamptz,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  content_type text not null default 'unknown'
    check (content_type in ('long', 'short', 'live', 'unknown')),
  thumbnail_url text,
  metadata_refreshed_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ci_youtube_daily (
  video_id text not null references public.ci_youtube_videos(video_id),
  metric_date date not null,
  views bigint not null check (views >= 0),
  estimated_minutes_watched numeric not null check (estimated_minutes_watched >= 0),
  likes integer check (likes is null or likes >= 0),
  comments integer check (comments is null or comments >= 0),
  shares integer check (shares is null or shares >= 0),
  subscribers_gained integer check (subscribers_gained is null or subscribers_gained >= 0),
  subscribers_lost integer check (subscribers_lost is null or subscribers_lost >= 0),
  source_updated_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (video_id, metric_date)
);

create index if not exists ci_youtube_daily_metric_date_idx
  on public.ci_youtube_daily(metric_date);

create table if not exists public.ci_hotmart_transactions (
  transaction_id text primary key,
  buyer_key text,
  product_id text,
  product_name text not null,
  status text not null
    check (status in ('approved', 'refunded', 'chargeback', 'canceled', 'expired', 'blocked', 'disputed', 'unknown')),
  order_date timestamptz,
  approved_date timestamptz,
  gross_value numeric(16,2),
  gross_currency text,
  fee_value numeric(16,2),
  fee_currency text,
  producer_net_value numeric(16,2),
  producer_net_currency text,
  payment_type text,
  offer_code text,
  subscription_id text,
  is_renewal boolean not null default false,
  tracking_src text,
  tracking_sck text,
  tracking_xcod text,
  last_event_at timestamptz not null,
  last_reconciled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ci_hotmart_transactions_status_idx
  on public.ci_hotmart_transactions(status);
create index if not exists ci_hotmart_transactions_approved_date_idx
  on public.ci_hotmart_transactions(approved_date);
create index if not exists ci_hotmart_transactions_product_id_idx
  on public.ci_hotmart_transactions(product_id);

create table if not exists public.ci_hotmart_events (
  id bigint generated always as identity primary key,
  event_key text not null unique,
  transaction_id text not null,
  event_type text not null,
  raw_status text not null,
  normalized_status text not null
    check (normalized_status in ('approved', 'refunded', 'chargeback', 'canceled', 'expired', 'blocked', 'disputed', 'unknown')),
  occurred_at timestamptz not null,
  source text not null check (source in ('webhook', 'reconciliation', 'fixture')),
  sanitized_payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now()
);

create index if not exists ci_hotmart_events_transaction_idx
  on public.ci_hotmart_events(transaction_id, occurred_at);

create table if not exists public.ci_sync_runs (
  run_id uuid primary key default gen_random_uuid(),
  source text not null
    check (source in ('youtube', 'hotmart_webhook', 'hotmart_reconciliation')),
  job_type text not null,
  status text not null check (status in ('running', 'success', 'partial', 'failed')),
  requested_start date,
  requested_end date,
  source_watermark date,
  rows_read integer not null default 0,
  rows_written integer not null default 0,
  rows_skipped integer not null default 0,
  repairs integer not null default 0,
  warnings jsonb not null default '[]'::jsonb,
  error_code text,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists ci_sync_runs_source_started_idx
  on public.ci_sync_runs(source, started_at desc);

create or replace function public.ci_apply_hotmart_event(
  p_event jsonb,
  p_transaction jsonb
)
returns table(inserted_event boolean, updated_transaction boolean, repaired_transaction boolean)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_inserted boolean := false;
  v_updated boolean := false;
  v_existed boolean := false;
  v_row_count integer := 0;
begin
  insert into public.ci_hotmart_events (
    event_key,
    transaction_id,
    event_type,
    raw_status,
    normalized_status,
    occurred_at,
    source,
    sanitized_payload
  ) values (
    p_event->>'event_key',
    p_event->>'transaction_id',
    p_event->>'event_type',
    p_event->>'raw_status',
    p_event->>'normalized_status',
    (p_event->>'occurred_at')::timestamptz,
    p_event->>'source',
    coalesce(p_event->'sanitized_payload', '{}'::jsonb)
  )
  on conflict (event_key) do nothing;

  get diagnostics v_row_count = row_count;
  v_inserted := v_row_count > 0;
  if not v_inserted then
    return query select false, false, false;
    return;
  end if;

  select exists(
    select 1
    from public.ci_hotmart_transactions
    where transaction_id = p_transaction->>'transaction_id'
  ) into v_existed;

  insert into public.ci_hotmart_transactions (
    transaction_id,
    buyer_key,
    product_id,
    product_name,
    status,
    order_date,
    approved_date,
    gross_value,
    gross_currency,
    fee_value,
    fee_currency,
    producer_net_value,
    producer_net_currency,
    payment_type,
    offer_code,
    subscription_id,
    is_renewal,
    tracking_src,
    tracking_sck,
    tracking_xcod,
    last_event_at,
    last_reconciled_at
  ) values (
    p_transaction->>'transaction_id',
    nullif(p_transaction->>'buyer_key', ''),
    nullif(p_transaction->>'product_id', ''),
    coalesce(p_transaction->>'product_name', 'Desconhecido'),
    p_transaction->>'status',
    nullif(p_transaction->>'order_date', '')::timestamptz,
    nullif(p_transaction->>'approved_date', '')::timestamptz,
    nullif(p_transaction->>'gross_value', '')::numeric,
    nullif(p_transaction->>'gross_currency', ''),
    nullif(p_transaction->>'fee_value', '')::numeric,
    nullif(p_transaction->>'fee_currency', ''),
    nullif(p_transaction->>'producer_net_value', '')::numeric,
    nullif(p_transaction->>'producer_net_currency', ''),
    nullif(p_transaction->>'payment_type', ''),
    nullif(p_transaction->>'offer_code', ''),
    nullif(p_transaction->>'subscription_id', ''),
    coalesce((p_transaction->>'is_renewal')::boolean, false),
    nullif(p_transaction->>'tracking_src', ''),
    nullif(p_transaction->>'tracking_sck', ''),
    nullif(p_transaction->>'tracking_xcod', ''),
    (p_transaction->>'last_event_at')::timestamptz,
    nullif(p_transaction->>'last_reconciled_at', '')::timestamptz
  )
  on conflict (transaction_id) do update set
    buyer_key = coalesce(excluded.buyer_key, ci_hotmart_transactions.buyer_key),
    product_id = excluded.product_id,
    product_name = excluded.product_name,
    status = excluded.status,
    order_date = excluded.order_date,
    approved_date = excluded.approved_date,
    gross_value = excluded.gross_value,
    gross_currency = excluded.gross_currency,
    fee_value = excluded.fee_value,
    fee_currency = excluded.fee_currency,
    producer_net_value = excluded.producer_net_value,
    producer_net_currency = excluded.producer_net_currency,
    payment_type = excluded.payment_type,
    offer_code = excluded.offer_code,
    subscription_id = excluded.subscription_id,
    is_renewal = excluded.is_renewal,
    tracking_src = excluded.tracking_src,
    tracking_sck = excluded.tracking_sck,
    tracking_xcod = excluded.tracking_xcod,
    last_event_at = excluded.last_event_at,
    last_reconciled_at = coalesce(excluded.last_reconciled_at, ci_hotmart_transactions.last_reconciled_at),
    updated_at = now()
  where excluded.last_event_at >= ci_hotmart_transactions.last_event_at;

  get diagnostics v_row_count = row_count;
  v_updated := v_row_count > 0;
  return query select true, v_updated, (v_existed and v_updated);
end;
$$;

alter table public.ci_youtube_videos enable row level security;
alter table public.ci_youtube_daily enable row level security;
alter table public.ci_hotmart_transactions enable row level security;
alter table public.ci_hotmart_events enable row level security;
alter table public.ci_sync_runs enable row level security;

revoke all on public.ci_youtube_videos from anon, authenticated;
revoke all on public.ci_youtube_daily from anon, authenticated;
revoke all on public.ci_hotmart_transactions from anon, authenticated;
revoke all on public.ci_hotmart_events from anon, authenticated;
revoke all on public.ci_sync_runs from anon, authenticated;
revoke execute on function public.ci_apply_hotmart_event(jsonb, jsonb) from public, anon, authenticated;

grant all on public.ci_youtube_videos to service_role;
grant all on public.ci_youtube_daily to service_role;
grant all on public.ci_hotmart_transactions to service_role;
grant all on public.ci_hotmart_events to service_role;
grant all on public.ci_sync_runs to service_role;
grant usage, select on sequence public.ci_hotmart_events_id_seq to service_role;
grant execute on function public.ci_apply_hotmart_event(jsonb, jsonb) to service_role;

commit;
