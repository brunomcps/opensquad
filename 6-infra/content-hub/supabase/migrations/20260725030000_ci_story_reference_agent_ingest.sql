begin;

alter table public.story_templates
  add column if not exists canonical_key text;

update public.story_templates
set canonical_key = case
  when lower(btrim(name)) = lower('Cena → lente → princípio') then 'cena-lente-principio'
  when lower(btrim(name)) = lower('História → pequena entrega → CTA') then 'historia-pequena-entrega-cta'
  else 'legacy-' || replace(template_id::text, '-', '')
end
where canonical_key is null;

alter table public.story_templates
  alter column canonical_key set not null;

alter table public.story_templates
  add constraint story_templates_canonical_key_check
  check (canonical_key ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

create unique index if not exists story_templates_active_canonical_key_idx
  on public.story_templates(canonical_key)
  where status <> 'archived';

alter table public.story_sequences
  add column if not exists reference_key text,
  add column if not exists content_hash text;

update public.story_sequences
set reference_key = case
      when source_url = 'https://www.instagram.com/_raulsena/' then 'instagram-raulsena-legacy'
      when source_url = 'https://opensquad.com.br/stories-para-enriquecer.pdf' then 'other-stories-para-enriquecer-legacy'
      else reference_key
    end,
    content_hash = case
      when source_url in (
        'https://www.instagram.com/_raulsena/',
        'https://opensquad.com.br/stories-para-enriquecer.pdf'
      ) then md5(sequence_id::text) || md5(sequence_id::text || '-legacy')
      else content_hash
    end
where kind = 'reference'
  and reference_key is null
  and source_url in (
    'https://www.instagram.com/_raulsena/',
    'https://opensquad.com.br/stories-para-enriquecer.pdf'
  );

alter table public.story_sequences
  add constraint story_sequences_reference_key_check
    check (reference_key is null or reference_key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  add constraint story_sequences_content_hash_check
    check (content_hash is null or content_hash ~ '^[0-9a-f]{64}$'),
  add constraint story_sequences_agent_identity_kind_check
    check ((reference_key is null and content_hash is null) or kind = 'reference');

create unique index if not exists story_sequences_reference_key_idx
  on public.story_sequences(reference_key)
  where reference_key is not null;

create table if not exists public.story_reference_revisions (
  revision_id bigint generated always as identity primary key,
  sequence_id uuid not null references public.story_sequences(sequence_id) on delete cascade,
  revision integer not null check (revision >= 1),
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  created_at timestamptz not null default now(),
  unique (sequence_id, revision)
);

create table if not exists public.ci_agent_request_nonces (
  key_id text not null check (key_id ~ '^[a-z0-9][a-z0-9._-]{0,79}$'),
  nonce text not null check (nonce ~ '^[A-Za-z0-9_-]{16,160}$'),
  requested_at timestamptz not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (key_id, nonce),
  check (expires_at > requested_at)
);

create index if not exists ci_agent_request_nonces_expiry_idx
  on public.ci_agent_request_nonces(expires_at);

create or replace function public.ci_claim_agent_nonce(
  p_key_id text,
  p_nonce text,
  p_requested_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_inserted integer;
begin
  if p_key_id !~ '^[a-z0-9][a-z0-9._-]{0,79}$'
    or p_nonce !~ '^[A-Za-z0-9_-]{16,160}$'
    or p_requested_at < now() - interval '5 minutes'
    or p_requested_at > now() + interval '30 seconds'
  then
    return false;
  end if;

  delete from public.ci_agent_request_nonces
  where ctid in (
    select ctid
    from public.ci_agent_request_nonces
    where expires_at < now()
    order by expires_at
    limit 100
  );

  insert into public.ci_agent_request_nonces (
    key_id, nonce, requested_at, expires_at
  ) values (
    p_key_id, p_nonce, p_requested_at, p_requested_at + interval '5 minutes'
  )
  on conflict do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted = 1;
end;
$$;

create or replace function public.story_upsert_agent_reference(
  p_reference_key text,
  p_content_hash text,
  p_template_canonical_key text,
  p_template jsonb,
  p_reference jsonb,
  p_items jsonb
)
returns table (
  sequence_id uuid,
  template_id uuid,
  content_revision integer,
  operation text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_template_id uuid;
  v_sequence_id uuid;
  v_existing public.story_sequences%rowtype;
  v_existing_template_id uuid;
  v_revision integer;
  v_item jsonb;
  v_item_id uuid;
  v_old_item_ids uuid[];
  v_snapshot_items jsonb;
begin
  if p_reference_key !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'invalid reference key' using errcode = '23514';
  end if;
  if p_content_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid content hash' using errcode = '23514';
  end if;
  if p_template_canonical_key !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'invalid template canonical key' using errcode = '23514';
  end if;
  if p_template is null or jsonb_typeof(p_template) <> 'object'
    or p_reference is null or jsonb_typeof(p_reference) <> 'object'
    or p_items is null or jsonb_typeof(p_items) <> 'array'
    or jsonb_array_length(p_items) < 1
    or jsonb_array_length(p_items) > 20
  then
    raise exception 'invalid agent reference payload' using errcode = '23514';
  end if;

  select template.template_id
  into v_template_id
  from public.story_templates template
  where template.canonical_key = p_template_canonical_key
    and template.status <> 'archived'
  for update;

  if v_template_id is null then
    if exists (
      select 1
      from public.story_templates template
      where lower(btrim(template.name)) = lower(btrim(p_template ->> 'name'))
        and template.status <> 'archived'
    ) then
      raise exception 'template identity conflict' using errcode = '23505';
    end if;

    insert into public.story_templates (
      canonical_key, name, description, objective, definition, tags, status
    ) values (
      p_template_canonical_key,
      p_template ->> 'name',
      nullif(p_template ->> 'description', ''),
      p_template ->> 'objective',
      p_template -> 'definition',
      array(
        select jsonb_array_elements_text(coalesce(p_template -> 'tags', '[]'::jsonb))
      ),
      'active'
    )
    returning story_templates.template_id into v_template_id;
  elsif exists (
    select 1
    from public.story_templates template
    where template.template_id = v_template_id
      and lower(btrim(template.name)) <> lower(btrim(p_template ->> 'name'))
  ) then
    raise exception 'template identity conflict' using errcode = '23505';
  end if;

  update public.story_templates template
  set name = p_template ->> 'name',
      description = nullif(p_template ->> 'description', ''),
      objective = p_template ->> 'objective',
      definition = p_template -> 'definition',
      tags = array(
        select jsonb_array_elements_text(coalesce(p_template -> 'tags', '[]'::jsonb))
      ),
      status = 'active'
  where template.template_id = v_template_id;

  select sequence.*
  into v_existing
  from public.story_sequences sequence
  where sequence.reference_key = p_reference_key
  for update;

  if v_existing.sequence_id is null then
    insert into public.story_sequences (
      kind, title, description, analysis, platform, source_account, source_url,
      source_started_at, source_ended_at, sequence_state, reference_key, content_hash
    ) values (
      'reference',
      p_reference ->> 'title',
      nullif(p_reference ->> 'description', ''),
      p_reference -> 'analysis',
      p_reference ->> 'platform',
      p_reference ->> 'sourceAccount',
      nullif(p_reference ->> 'sourceUrl', ''),
      nullif(p_reference ->> 'sourceStartedAt', '')::timestamptz,
      nullif(p_reference ->> 'sourceEndedAt', '')::timestamptz,
      'closed',
      p_reference_key,
      p_content_hash
    )
    returning story_sequences.sequence_id, story_sequences.content_revision
    into v_sequence_id, v_revision;

    insert into public.template_sequence_links (
      template_id, sequence_id, relationship, is_primary
    ) values (
      v_template_id, v_sequence_id, 'inspiration', true
    );

    for v_item in select value from jsonb_array_elements(p_items)
    loop
      insert into public.story_items (
        media_type, asset_url, text_content, metadata, source_occurred_at, source_platform
      ) values (
        v_item ->> 'mediaType',
        nullif(v_item ->> 'assetUrl', ''),
        nullif(v_item ->> 'textContent', ''),
        coalesce(v_item -> 'metadata', '{}'::jsonb),
        nullif(v_item ->> 'sourceOccurredAt', '')::timestamptz,
        p_reference ->> 'platform'
      )
      returning story_items.item_id into v_item_id;

      insert into public.sequence_item_links (
        sequence_id, item_id, narrative_order, narrative_role
      ) values (
        v_sequence_id,
        v_item_id,
        (v_item ->> 'narrativeOrder')::integer,
        v_item ->> 'narrativeRole'
      );
    end loop;

    return query select v_sequence_id, v_template_id, v_revision, 'created'::text;
    return;
  end if;

  v_sequence_id := v_existing.sequence_id;
  select link.template_id
  into v_existing_template_id
  from public.template_sequence_links link
  where link.sequence_id = v_sequence_id
    and link.is_primary;

  if v_existing.kind <> 'reference' or v_existing_template_id is distinct from v_template_id then
    raise exception 'reference identity conflict' using errcode = '23505';
  end if;

  if v_existing.content_hash = p_content_hash then
    return query
      select v_sequence_id, v_template_id, v_existing.content_revision, 'unchanged'::text;
    return;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'item', to_jsonb(item),
        'narrativeOrder', link.narrative_order,
        'narrativeRole', link.narrative_role
      )
      order by link.narrative_order
    ),
    '[]'::jsonb
  )
  into v_snapshot_items
  from public.sequence_item_links link
  join public.story_items item on item.item_id = link.item_id
  where link.sequence_id = v_sequence_id;

  insert into public.story_reference_revisions (
    sequence_id, revision, content_hash, snapshot
  ) values (
    v_sequence_id,
    v_existing.content_revision,
    v_existing.content_hash,
    jsonb_build_object(
      'sequence', to_jsonb(v_existing),
      'templateId', v_template_id,
      'items', v_snapshot_items
    )
  );

  select array_agg(link.item_id)
  into v_old_item_ids
  from public.sequence_item_links link
  where link.sequence_id = v_sequence_id;

  update public.story_sequences sequence
  set title = p_reference ->> 'title',
      description = nullif(p_reference ->> 'description', ''),
      analysis = p_reference -> 'analysis',
      platform = p_reference ->> 'platform',
      source_account = p_reference ->> 'sourceAccount',
      source_url = nullif(p_reference ->> 'sourceUrl', ''),
      source_started_at = nullif(p_reference ->> 'sourceStartedAt', '')::timestamptz,
      source_ended_at = nullif(p_reference ->> 'sourceEndedAt', '')::timestamptz,
      sequence_state = 'closed',
      content_hash = p_content_hash,
      content_revision = sequence.content_revision + 1
  where sequence.sequence_id = v_sequence_id
  returning sequence.content_revision into v_revision;

  delete from public.sequence_item_links link
  where link.sequence_id = v_sequence_id;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    insert into public.story_items (
      media_type, asset_url, text_content, metadata, source_occurred_at, source_platform
    ) values (
      v_item ->> 'mediaType',
      nullif(v_item ->> 'assetUrl', ''),
      nullif(v_item ->> 'textContent', ''),
      coalesce(v_item -> 'metadata', '{}'::jsonb),
      nullif(v_item ->> 'sourceOccurredAt', '')::timestamptz,
      p_reference ->> 'platform'
    )
    returning story_items.item_id into v_item_id;

    insert into public.sequence_item_links (
      sequence_id, item_id, narrative_order, narrative_role
    ) values (
      v_sequence_id,
      v_item_id,
      (v_item ->> 'narrativeOrder')::integer,
      v_item ->> 'narrativeRole'
    );
  end loop;

  delete from public.story_items item
  where item.item_id = any(coalesce(v_old_item_ids, array[]::uuid[]))
    and not exists (
      select 1 from public.sequence_item_links link where link.item_id = item.item_id
    );

  return query select v_sequence_id, v_template_id, v_revision, 'updated'::text;
end;
$$;

alter table public.story_reference_revisions enable row level security;
alter table public.ci_agent_request_nonces enable row level security;

revoke all on table public.story_reference_revisions from public, anon, authenticated;
revoke all on table public.ci_agent_request_nonces from public, anon, authenticated;
revoke all on function public.ci_claim_agent_nonce(text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.story_upsert_agent_reference(text, text, text, jsonb, jsonb, jsonb)
  from public, anon, authenticated;

grant select on table public.story_reference_revisions to service_role;
grant execute on function public.ci_claim_agent_nonce(text, text, timestamptz) to service_role;
grant execute on function public.story_upsert_agent_reference(text, text, text, jsonb, jsonb, jsonb)
  to service_role;

commit;
