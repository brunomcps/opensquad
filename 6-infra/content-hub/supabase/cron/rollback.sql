begin;

select cron.unschedule(jobid)
from cron.job
where jobname in ('ci-youtube-daily', 'ci-hotmart-daily');

commit;
