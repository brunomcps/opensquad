begin;

alter table public.ci_campaigns
  drop constraint if exists ci_campaigns_cta_position_check;

alter table public.ci_campaigns
  add constraint ci_campaigns_cta_position_check
  check (cta_position in (
    'description',
    'pinned_comment',
    'comment_reply',
    'video',
    'bio',
    'community',
    'other'
  ));

alter table public.ci_campaigns
  drop constraint if exists ci_campaigns_tracking_code_hotmart_safe_check;

alter table public.ci_campaigns
  add constraint ci_campaigns_tracking_code_hotmart_safe_check
  check (tracking_code ~ '^[A-Za-z0-9|]+$') not valid;

alter table public.ci_campaigns
  validate constraint ci_campaigns_tracking_code_hotmart_safe_check;

commit;
