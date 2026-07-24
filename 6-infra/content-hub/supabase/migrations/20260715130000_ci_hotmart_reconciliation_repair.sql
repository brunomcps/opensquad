begin;

-- Webhooks are intentionally accepted with partial financial data. A later
-- reconciliation must enrich the snapshot without an incomplete newer webhook
-- erasing official values already stored.
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
  v_repaired boolean := false;
  v_existed boolean := false;
  v_row_count integer := 0;
  v_before_snapshot jsonb;
  v_after_snapshot jsonb;
  v_current_src_is_campaign boolean := false;
  v_current_sck_is_campaign boolean := false;
  v_current_xcod_is_campaign boolean := false;
  v_incoming_src_is_campaign boolean := false;
  v_incoming_sck_is_campaign boolean := false;
  v_incoming_xcod_is_campaign boolean := false;
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

  -- A duplicate webhook is already reflected in the snapshot. A duplicate
  -- reconciliation must still be allowed to repair fields that used to be null.
  if not v_inserted and p_event->>'source' <> 'reconciliation' then
    return query select false, false, false;
    return;
  end if;

  select to_jsonb(transactions) - 'last_reconciled_at' - 'updated_at'
  into v_before_snapshot
  from public.ci_hotmart_transactions transactions
  where transactions.transaction_id = p_transaction->>'transaction_id'
  for update;
  v_existed := found;

  select
    exists(
      select 1 from public.ci_campaigns campaigns
      where lower(campaigns.tracking_code) = lower(v_before_snapshot->>'tracking_src')
    ),
    exists(
      select 1 from public.ci_campaigns campaigns
      where lower(campaigns.tracking_code) = lower(v_before_snapshot->>'tracking_sck')
    ),
    exists(
      select 1 from public.ci_campaigns campaigns
      where lower(campaigns.tracking_code) = lower(v_before_snapshot->>'tracking_xcod')
    ),
    exists(
      select 1 from public.ci_campaigns campaigns
      where lower(campaigns.tracking_code) = lower(nullif(p_transaction->>'tracking_src', ''))
    ),
    exists(
      select 1 from public.ci_campaigns campaigns
      where lower(campaigns.tracking_code) = lower(nullif(p_transaction->>'tracking_sck', ''))
    ),
    exists(
      select 1 from public.ci_campaigns campaigns
      where lower(campaigns.tracking_code) = lower(nullif(p_transaction->>'tracking_xcod', ''))
    )
  into
    v_current_src_is_campaign,
    v_current_sck_is_campaign,
    v_current_xcod_is_campaign,
    v_incoming_src_is_campaign,
    v_incoming_sck_is_campaign,
    v_incoming_xcod_is_campaign;

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
    product_id = coalesce(excluded.product_id, ci_hotmart_transactions.product_id),
    product_name = case
      when excluded.product_name <> 'Desconhecido' then excluded.product_name
      else ci_hotmart_transactions.product_name
    end,
    status = case
      when excluded.status = 'unknown'
        and ci_hotmart_transactions.status <> 'unknown'
      then ci_hotmart_transactions.status
      when excluded.status in ('refunded', 'chargeback')
        and (
          p_event->>'source' = 'reconciliation'
          or excluded.last_event_at >= ci_hotmart_transactions.last_event_at
          or ci_hotmart_transactions.status not in ('refunded', 'chargeback')
        )
      then excluded.status
      when ci_hotmart_transactions.status in ('refunded', 'chargeback')
      then ci_hotmart_transactions.status
      when p_event->>'source' = 'reconciliation'
        or excluded.last_event_at >= ci_hotmart_transactions.last_event_at
        or ci_hotmart_transactions.status = 'unknown'
      then excluded.status
      else ci_hotmart_transactions.status
    end,
    order_date = coalesce(excluded.order_date, ci_hotmart_transactions.order_date),
    approved_date = coalesce(excluded.approved_date, ci_hotmart_transactions.approved_date),
    gross_value = case
      when p_event->>'source' = 'reconciliation'
        then coalesce(excluded.gross_value, ci_hotmart_transactions.gross_value)
      else coalesce(ci_hotmart_transactions.gross_value, excluded.gross_value)
    end,
    gross_currency = case
      when p_event->>'source' = 'reconciliation'
        then coalesce(excluded.gross_currency, ci_hotmart_transactions.gross_currency)
      else coalesce(ci_hotmart_transactions.gross_currency, excluded.gross_currency)
    end,
    fee_value = case
      when p_event->>'source' = 'reconciliation'
        then coalesce(excluded.fee_value, ci_hotmart_transactions.fee_value)
      else coalesce(ci_hotmart_transactions.fee_value, excluded.fee_value)
    end,
    fee_currency = case
      when p_event->>'source' = 'reconciliation'
        then coalesce(excluded.fee_currency, ci_hotmart_transactions.fee_currency)
      else coalesce(ci_hotmart_transactions.fee_currency, excluded.fee_currency)
    end,
    producer_net_value = case
      when p_event->>'source' = 'reconciliation'
        then coalesce(excluded.producer_net_value, ci_hotmart_transactions.producer_net_value)
      else coalesce(ci_hotmart_transactions.producer_net_value, excluded.producer_net_value)
    end,
    producer_net_currency = case
      when p_event->>'source' = 'reconciliation'
        then coalesce(excluded.producer_net_currency, ci_hotmart_transactions.producer_net_currency)
      else coalesce(ci_hotmart_transactions.producer_net_currency, excluded.producer_net_currency)
    end,
    payment_type = coalesce(excluded.payment_type, ci_hotmart_transactions.payment_type),
    offer_code = coalesce(excluded.offer_code, ci_hotmart_transactions.offer_code),
    subscription_id = coalesce(excluded.subscription_id, ci_hotmart_transactions.subscription_id),
    is_renewal = excluded.is_renewal or ci_hotmart_transactions.is_renewal,
    tracking_src = case
      when v_current_src_is_campaign then ci_hotmart_transactions.tracking_src
      when v_incoming_src_is_campaign then excluded.tracking_src
      else coalesce(ci_hotmart_transactions.tracking_src, excluded.tracking_src)
    end,
    tracking_sck = case
      when v_current_sck_is_campaign then ci_hotmart_transactions.tracking_sck
      when v_incoming_sck_is_campaign then excluded.tracking_sck
      else coalesce(ci_hotmart_transactions.tracking_sck, excluded.tracking_sck)
    end,
    tracking_xcod = case
      when v_current_xcod_is_campaign then ci_hotmart_transactions.tracking_xcod
      when v_incoming_xcod_is_campaign then excluded.tracking_xcod
      else coalesce(ci_hotmart_transactions.tracking_xcod, excluded.tracking_xcod)
    end,
    last_event_at = greatest(excluded.last_event_at, ci_hotmart_transactions.last_event_at),
    last_reconciled_at = case
      when excluded.last_reconciled_at is null then ci_hotmart_transactions.last_reconciled_at
      when ci_hotmart_transactions.last_reconciled_at is null then excluded.last_reconciled_at
      else greatest(excluded.last_reconciled_at, ci_hotmart_transactions.last_reconciled_at)
    end,
    updated_at = now()
  where excluded.last_event_at > ci_hotmart_transactions.last_event_at
    or (v_inserted and excluded.last_event_at = ci_hotmart_transactions.last_event_at)
    or (
      v_inserted
      and excluded.last_reconciled_at is not null
      and (
        ci_hotmart_transactions.last_reconciled_at is null
        or excluded.last_reconciled_at > ci_hotmart_transactions.last_reconciled_at
      )
    )
    or (
      p_event->>'source' = 'reconciliation'
      and (
        (excluded.gross_value is not null and excluded.gross_value is distinct from ci_hotmart_transactions.gross_value)
        or (excluded.gross_currency is not null and excluded.gross_currency is distinct from ci_hotmart_transactions.gross_currency)
        or (excluded.fee_value is not null and excluded.fee_value is distinct from ci_hotmart_transactions.fee_value)
        or (excluded.fee_currency is not null and excluded.fee_currency is distinct from ci_hotmart_transactions.fee_currency)
        or (excluded.producer_net_value is not null and excluded.producer_net_value is distinct from ci_hotmart_transactions.producer_net_value)
        or (excluded.producer_net_currency is not null and excluded.producer_net_currency is distinct from ci_hotmart_transactions.producer_net_currency)
      )
    )
    or (
      excluded.status in ('refunded', 'chargeback')
      and excluded.status is distinct from ci_hotmart_transactions.status
      and (
        p_event->>'source' = 'reconciliation'
        or excluded.last_event_at >= ci_hotmart_transactions.last_event_at
        or ci_hotmart_transactions.status not in ('refunded', 'chargeback')
      )
    )
    or (
      p_event->>'source' = 'reconciliation'
      and excluded.status not in ('unknown', 'refunded', 'chargeback')
      and ci_hotmart_transactions.status not in ('refunded', 'chargeback')
      and excluded.status is distinct from ci_hotmart_transactions.status
    )
    or (
      p_event->>'source' = 'reconciliation'
      and (
        (
          v_incoming_src_is_campaign
          and not v_current_src_is_campaign
          and excluded.tracking_src is distinct from ci_hotmart_transactions.tracking_src
        )
        or (
          v_incoming_sck_is_campaign
          and not v_current_sck_is_campaign
          and excluded.tracking_sck is distinct from ci_hotmart_transactions.tracking_sck
        )
        or (
          v_incoming_xcod_is_campaign
          and not v_current_xcod_is_campaign
          and excluded.tracking_xcod is distinct from ci_hotmart_transactions.tracking_xcod
        )
      )
    )
    or (ci_hotmart_transactions.buyer_key is null and excluded.buyer_key is not null)
    or (ci_hotmart_transactions.product_id is null and excluded.product_id is not null)
    or (ci_hotmart_transactions.product_name = 'Desconhecido' and excluded.product_name <> 'Desconhecido')
    or (ci_hotmart_transactions.status = 'unknown' and excluded.status <> 'unknown')
    or (ci_hotmart_transactions.order_date is null and excluded.order_date is not null)
    or (ci_hotmart_transactions.approved_date is null and excluded.approved_date is not null)
    or (ci_hotmart_transactions.gross_value is null and excluded.gross_value is not null)
    or (ci_hotmart_transactions.gross_currency is null and excluded.gross_currency is not null)
    or (ci_hotmart_transactions.fee_value is null and excluded.fee_value is not null)
    or (ci_hotmart_transactions.fee_currency is null and excluded.fee_currency is not null)
    or (ci_hotmart_transactions.producer_net_value is null and excluded.producer_net_value is not null)
    or (ci_hotmart_transactions.producer_net_currency is null and excluded.producer_net_currency is not null)
    or (ci_hotmart_transactions.payment_type is null and excluded.payment_type is not null)
    or (ci_hotmart_transactions.offer_code is null and excluded.offer_code is not null)
    or (ci_hotmart_transactions.subscription_id is null and excluded.subscription_id is not null)
    or (not ci_hotmart_transactions.is_renewal and excluded.is_renewal)
    or (ci_hotmart_transactions.tracking_src is null and excluded.tracking_src is not null)
    or (ci_hotmart_transactions.tracking_sck is null and excluded.tracking_sck is not null)
    or (ci_hotmart_transactions.tracking_xcod is null and excluded.tracking_xcod is not null);

  get diagnostics v_row_count = row_count;
  v_updated := v_row_count > 0;
  if v_existed and v_updated then
    select to_jsonb(transactions) - 'last_reconciled_at' - 'updated_at'
    into v_after_snapshot
    from public.ci_hotmart_transactions transactions
    where transactions.transaction_id = p_transaction->>'transaction_id';
    v_repaired := v_after_snapshot is distinct from v_before_snapshot;
  end if;

  return query select v_inserted, v_updated, v_repaired;
end;
$$;

revoke execute on function public.ci_apply_hotmart_event(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.ci_apply_hotmart_event(jsonb, jsonb) to service_role;

commit;
