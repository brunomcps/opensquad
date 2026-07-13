begin;

create table if not exists public.ci_campaigns (
  campaign_id uuid primary key default gen_random_uuid(),
  tracking_code text not null unique
    check (char_length(tracking_code) between 1 and 30)
    check (tracking_code !~ '_')
    check (tracking_code ~ '^[A-Za-z0-9|.-]+$'),
  slug text not null unique
    check (char_length(slug) between 6 and 48)
    check (slug ~ '^[a-z0-9-]+$'),
  name text not null check (char_length(trim(name)) between 3 and 120),
  channel text not null default 'youtube' check (channel = 'youtube'),
  video_id text not null references public.ci_youtube_videos(video_id),
  product_id text not null,
  product_name text not null,
  offer_code text,
  destination_url text not null check (destination_url ~ '^https?://'),
  tracking_parameter text not null check (tracking_parameter in ('sck', 'src')),
  cta_label text not null check (char_length(trim(cta_label)) between 2 and 120),
  cta_position text not null
    check (cta_position in ('description', 'pinned_comment', 'video', 'bio', 'community', 'other')),
  utm_source text not null default 'youtube',
  utm_medium text not null default 'organic',
  utm_campaign text not null,
  utm_content text,
  utm_term text,
  status text not null default 'active' check (status in ('draft', 'active', 'inactive')),
  starts_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ci_campaigns_video_idx
  on public.ci_campaigns(video_id, created_at desc);
create index if not exists ci_campaigns_product_idx
  on public.ci_campaigns(product_id, created_at desc);
create index if not exists ci_campaigns_status_idx
  on public.ci_campaigns(status, created_at desc);
create index if not exists ci_campaigns_tracking_code_lower_idx
  on public.ci_campaigns(lower(tracking_code));

create table if not exists public.ci_click_events (
  click_id bigint generated always as identity primary key,
  campaign_id uuid not null references public.ci_campaigns(campaign_id) on delete restrict,
  clicked_at timestamptz not null default now(),
  referrer_host text,
  device_type text not null default 'unknown'
    check (device_type in ('desktop', 'mobile', 'tablet', 'unknown')),
  is_bot boolean not null default false
);

create index if not exists ci_click_events_campaign_date_idx
  on public.ci_click_events(campaign_id, clicked_at desc);

alter table public.ci_campaigns enable row level security;
alter table public.ci_click_events enable row level security;

revoke all on table public.ci_campaigns from anon, authenticated;
revoke all on table public.ci_click_events from anon, authenticated;
grant all on table public.ci_campaigns to service_role;
grant all on table public.ci_click_events to service_role;
grant usage, select on sequence public.ci_click_events_click_id_seq to service_role;

commit;
