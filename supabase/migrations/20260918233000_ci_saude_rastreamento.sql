-- Etapa 4 da faxina (18/09/2026): saúde do rastreamento.
--
-- 1. ci_redirect_checks: resultado do teste horário do link curto (HEAD em
--    link.brunosallesphd.com.br/m7p/<slug>, feito pela função ci-redirect-check).
-- 2. ci_click_signals: cabeçalhos do navegador dos cliques que o classificador
--    não soube ler ("unknown"), guardados 30 dias pra ajustar o classificador.
--    Sem IP. Limpeza diária por cron.
-- 3. ci_tracking_freshness(): passa a devolver também YouTube (última sync,
--    último dia com métrica) e redirecionador (último teste), e o "último
--    clique" passa a olhar TODOS os links (antes ignorava card do vídeo e
--    Instagram).
-- 4. Crons: ci-redirect-hourly (minuto 17 de cada hora) e
--    ci-click-signals-cleanup (07:25 UTC = 04:25 BRT).
-- Aplicada em produção em 18/09/2026 via MCP.

create table if not exists public.ci_redirect_checks (
  check_id bigserial primary key,
  checked_at timestamptz not null default now(),
  slug text not null,
  ok boolean not null,
  http_status integer,
  latency_ms integer,
  fallback boolean not null default false,
  detail text
);
create index if not exists ci_redirect_checks_checked_at_idx on public.ci_redirect_checks (checked_at desc);
alter table public.ci_redirect_checks enable row level security;
revoke all on table public.ci_redirect_checks from anon, authenticated;
grant all on table public.ci_redirect_checks to service_role;

create table if not exists public.ci_click_signals (
  click_id bigint primary key references public.ci_click_events(click_id) on delete cascade,
  signals jsonb not null,
  recorded_at timestamptz not null default now()
);
create index if not exists ci_click_signals_recorded_at_idx on public.ci_click_signals (recorded_at);
alter table public.ci_click_signals enable row level security;
revoke all on table public.ci_click_signals from anon, authenticated;
grant all on table public.ci_click_signals to service_role;

drop function if exists public.ci_tracking_freshness();

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
  unresolved_operational_failures bigint,
  last_youtube_sync_at timestamptz,
  last_youtube_sync_status text,
  last_youtube_metric_date date,
  youtube_schedule_active boolean,
  last_redirect_check_at timestamptz,
  last_redirect_check_ok boolean,
  last_redirect_check_status integer,
  last_redirect_check_latency_ms integer,
  last_redirect_check_fallback boolean,
  last_redirect_check_detail text,
  last_redirect_check_slug text,
  redirect_schedule_active boolean
)
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_schedule_active boolean := false;
  v_schedule_expression text := null;
  v_youtube_schedule_active boolean := false;
  v_redirect_schedule_active boolean := false;
  v_last_reconciliation_attempt_at timestamptz := null;
  v_last_reconciliation_status text := null;
  v_last_reconciliation_warnings jsonb := '[]'::jsonb;
  v_last_reconciliation_error_code text := null;
  v_last_reconciliation_error_message text := null;
  v_last_youtube_sync_at timestamptz := null;
  v_last_youtube_sync_status text := null;
  v_check record;
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
    execute $schedule$ select coalesce(bool_or(active), false) from cron.job where jobname = $1 $schedule$
    into v_youtube_schedule_active using 'ci-youtube-daily';
    execute $schedule$ select coalesce(bool_or(active), false) from cron.job where jobname = $1 $schedule$
    into v_redirect_schedule_active using 'ci-redirect-hourly';
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

  -- YouTube: "parcial" é normal (os últimos 2-3 dias ainda não existem no
  -- YouTube Analytics); só "failed" é problema.
  select runs.finished_at, runs.status
  into v_last_youtube_sync_at, v_last_youtube_sync_status
  from public.ci_sync_runs runs
  where runs.source = 'youtube'
  order by runs.started_at desc, runs.run_id desc
  limit 1;

  select checks.checked_at, checks.ok, checks.http_status, checks.latency_ms, checks.fallback, checks.detail, checks.slug
  into v_check
  from public.ci_redirect_checks checks
  order by checks.checked_at desc, checks.check_id desc
  limit 1;

  return query
  select
    (select max(clicks.clicked_at) from public.ci_click_events clicks),
    (select max(clicks.clicked_at) from public.ci_click_events clicks
      where clicks.traffic_classification = 'qualified'),
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
      where severity in ('warning', 'error') and resolved_at is null),
    v_last_youtube_sync_at,
    v_last_youtube_sync_status,
    (select max(metric_date) from public.ci_youtube_daily),
    v_youtube_schedule_active,
    v_check.checked_at,
    v_check.ok,
    v_check.http_status,
    v_check.latency_ms,
    v_check.fallback,
    v_check.detail,
    v_check.slug,
    v_redirect_schedule_active;
end;
$$;

revoke all on function public.ci_tracking_freshness() from public, anon, authenticated;
grant execute on function public.ci_tracking_freshness() to service_role;

-- Crons (idempotentes: remove e recria).
do $$
begin
  if to_regclass('cron.job') is null then return; end if;
  if exists (select 1 from cron.job where jobname = 'ci-redirect-hourly') then
    perform cron.unschedule('ci-redirect-hourly');
  end if;
  perform cron.schedule('ci-redirect-hourly', '17 * * * *', $cron$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'ci_project_url')
        || '/functions/v1/ci-redirect-check',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-ci-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'ci_cron_secret')
      ),
      body := '{}'::jsonb
    );
  $cron$);
  if exists (select 1 from cron.job where jobname = 'ci-click-signals-cleanup') then
    perform cron.unschedule('ci-click-signals-cleanup');
  end if;
  perform cron.schedule('ci-click-signals-cleanup', '25 7 * * *', $cron$
    delete from public.ci_click_signals where recorded_at < now() - interval '30 days';
    delete from public.ci_redirect_checks where checked_at < now() - interval '90 days';
  $cron$);
end;
$$;
