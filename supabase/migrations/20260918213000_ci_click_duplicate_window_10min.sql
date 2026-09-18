-- Clique repetido da MESMA pessoa (mesma impressão digital diária) no MESMO link
-- passa a contar uma vez por 10 minutos, não por 30 segundos. Auditoria de
-- 18/09/2026: 62 cliques em 30 dias (2,4%) eram a mesma pessoa clicando de novo
-- em até 10 min e contavam em dobro. Decisão do Bruno: 10 minutos.
-- Aplicada em produção em 18/09/2026 via MCP.
create or replace function public.ci_record_campaign_click(
  p_campaign_id uuid,
  p_referrer_host text,
  p_device_type text,
  p_is_bot boolean,
  p_traffic_classification text,
  p_exclusion_reason text,
  p_fingerprint_hash text
)
returns table(recorded_click_id bigint, recorded_traffic_classification text, recorded_exclusion_reason text)
language plpgsql
security definer
set search_path to 'public'
as $function$
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
        and previous.clicked_at >= v_clicked_at - interval '10 minutes'
        and previous.clicked_at <= v_clicked_at
    ) then
      v_classification := 'duplicate';
      v_exclusion_reason := 'same_fingerprint_within_10min';
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
$function$;
