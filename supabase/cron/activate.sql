begin;

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

do $$
begin
  if not exists (select 1 from vault.decrypted_secrets where name = 'ci_project_url') then
    raise exception 'Vault secret ci_project_url is missing';
  end if;
  if not exists (select 1 from vault.decrypted_secrets where name = 'ci_cron_secret') then
    raise exception 'Vault secret ci_cron_secret is missing';
  end if;
end
$$;

select cron.unschedule(jobid)
from cron.job
where jobname in ('ci-youtube-daily', 'ci-hotmart-daily');

select cron.schedule(
  'ci-youtube-daily',
  '10 9 * * *',
  $job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'ci_project_url')
        || '/functions/v1/ci-sync-youtube',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-ci-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'ci_cron_secret')
      ),
      body := '{}'::jsonb
    );
  $job$
);

select cron.schedule(
  'ci-hotmart-daily',
  '40 9 * * *',
  $job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'ci_project_url')
        || '/functions/v1/ci-sync-hotmart',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-ci-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'ci_cron_secret')
      ),
      body := '{}'::jsonb
    );
  $job$
);

commit;
