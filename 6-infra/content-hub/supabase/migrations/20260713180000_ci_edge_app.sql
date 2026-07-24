begin;

create table if not exists public.ci_app_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('viewer', 'admin')),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ci_sync_locks (
  source text primary key check (source in ('youtube', 'hotmart_reconciliation')),
  owner_id uuid not null,
  acquired_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists ci_sync_locks_expires_at_idx
  on public.ci_sync_locks(expires_at);

alter table public.ci_app_members enable row level security;
alter table public.ci_sync_locks enable row level security;

revoke all on table public.ci_app_members from anon, authenticated;
revoke all on table public.ci_sync_locks from anon, authenticated;
grant select on table public.ci_app_members to authenticated;
grant all on table public.ci_app_members to service_role;
grant all on table public.ci_sync_locks to service_role;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'ci_app_members'
      and policyname = 'ci_app_members_select_self'
  ) then
    create policy ci_app_members_select_self
      on public.ci_app_members
      for select
      to authenticated
      using ((select auth.uid()) = user_id);
  end if;
end
$$;

create or replace function public.ci_acquire_sync_lock(
  p_source text,
  p_owner_id uuid,
  p_ttl_seconds integer default 140
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_source not in ('youtube', 'hotmart_reconciliation') then
    raise exception 'invalid sync source';
  end if;

  if p_ttl_seconds < 30 or p_ttl_seconds > 145 then
    raise exception 'invalid lock ttl';
  end if;

  insert into public.ci_sync_locks (
    source,
    owner_id,
    acquired_at,
    expires_at
  ) values (
    p_source,
    p_owner_id,
    now(),
    now() + make_interval(secs => p_ttl_seconds)
  )
  on conflict (source) do update
    set owner_id = excluded.owner_id,
        acquired_at = excluded.acquired_at,
        expires_at = excluded.expires_at
    where public.ci_sync_locks.expires_at <= now();

  return found;
end;
$$;

create or replace function public.ci_release_sync_lock(
  p_source text,
  p_owner_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  delete from public.ci_sync_locks
  where source = p_source
    and owner_id = p_owner_id;

  get diagnostics deleted_count = row_count;
  return deleted_count = 1;
end;
$$;

revoke all on function public.ci_acquire_sync_lock(text, uuid, integer) from public, anon, authenticated;
revoke all on function public.ci_release_sync_lock(text, uuid) from public, anon, authenticated;
grant execute on function public.ci_acquire_sync_lock(text, uuid, integer) to service_role;
grant execute on function public.ci_release_sync_lock(text, uuid) to service_role;

commit;
