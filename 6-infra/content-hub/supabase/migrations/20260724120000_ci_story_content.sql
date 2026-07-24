begin;

create table public.story_templates (
  template_id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 160),
  description text check (description is null or char_length(description) <= 4000),
  objective text not null check (char_length(btrim(objective)) between 1 and 1000),
  definition jsonb not null
    check (jsonb_typeof(definition) = 'object')
    check (definition ? 'steps')
    check (jsonb_typeof(definition -> 'steps') = 'array')
    check (jsonb_array_length(definition -> 'steps') between 1 and 12)
    check (octet_length(definition::text) <= 131072),
  tags text[] not null default array[]::text[] check (cardinality(tags) <= 20),
  schema_version smallint not null default 1 check (schema_version > 0),
  status text not null default 'active' check (status in ('draft', 'active', 'archived')),
  created_by uuid references public.ci_app_members(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (updated_at >= created_at)
);

create table public.story_sequences (
  sequence_id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('reference', 'publication')),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  description text check (description is null or char_length(description) <= 4000),
  analysis jsonb not null default '{}'::jsonb
    check (jsonb_typeof(analysis) = 'object')
    check (octet_length(analysis::text) <= 131072),
  platform text not null default 'instagram' check (platform in ('instagram', 'facebook', 'tiktok', 'youtube', 'other')),
  source_account text check (source_account is null or char_length(source_account) <= 160),
  source_url text check (source_url is null or (char_length(source_url) <= 2048 and source_url ~ '^https://')),
  source_started_at timestamptz,
  source_ended_at timestamptz,
  sequence_state text not null default 'open' check (sequence_state in ('open', 'closed', 'archived')),
  publication_state text check (publication_state is null or publication_state in (
    'draft', 'pending_approval', 'changes_requested', 'approved', 'scheduled', 'published', 'cancelled', 'failed'
  )),
  scheduled_for timestamptz,
  published_at timestamptz,
  external_publication_id text check (external_publication_id is null or char_length(external_publication_id) <= 255),
  content_revision integer not null default 1 check (content_revision >= 1),
  approved_revision integer check (approved_revision is null or approved_revision >= 1),
  approved_at timestamptz,
  approved_by uuid references public.ci_app_members(user_id) on delete restrict,
  review_note text check (review_note is null or char_length(review_note) <= 4000),
  created_by uuid references public.ci_app_members(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (updated_at >= created_at),
  check (source_ended_at is null or source_started_at is null or source_ended_at >= source_started_at),
  check (kind <> 'reference' or (
    publication_state is null and scheduled_for is null and published_at is null and external_publication_id is null
    and approved_revision is null and approved_at is null and approved_by is null
  )),
  check (kind <> 'publication' or publication_state is not null),
  check ((approved_at is null and approved_by is null and approved_revision is null) or (
    kind = 'publication' and approved_at is not null and approved_by is not null and approved_revision = content_revision
  )),
  check (publication_state not in ('approved', 'scheduled', 'published') or (
    approved_at is not null and approved_by is not null and approved_revision = content_revision
  )),
  check (publication_state <> 'scheduled' or scheduled_for is not null),
  check (publication_state <> 'published' or published_at is not null)
);

create table public.story_items (
  item_id uuid primary key default gen_random_uuid(),
  media_type text not null check (media_type in ('image', 'video', 'text', 'link', 'poll', 'quiz', 'other')),
  asset_url text check (asset_url is null or (char_length(asset_url) <= 2048 and asset_url ~ '^https://')),
  thumbnail_url text check (thumbnail_url is null or (char_length(thumbnail_url) <= 2048 and thumbnail_url ~ '^https://')),
  text_content text check (text_content is null or char_length(text_content) <= 10000),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object')
    check (octet_length(metadata::text) <= 131072),
  source_occurred_at timestamptz,
  source_expires_at timestamptz,
  source_platform text check (source_platform is null or source_platform in ('instagram', 'facebook', 'tiktok', 'youtube', 'other')),
  source_item_id text check (source_item_id is null or char_length(source_item_id) <= 255),
  created_by uuid references public.ci_app_members(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (updated_at >= created_at),
  check (source_expires_at is null or source_occurred_at is null or source_expires_at >= source_occurred_at),
  check (source_item_id is null or source_platform is not null),
  check (asset_url is not null or text_content is not null or metadata <> '{}'::jsonb)
);

create table public.sequence_item_links (
  sequence_id uuid not null references public.story_sequences(sequence_id) on delete cascade,
  item_id uuid not null references public.story_items(item_id) on delete restrict,
  narrative_order integer not null check (narrative_order > 0),
  narrative_role text check (narrative_role is null or narrative_role in ('hook', 'context', 'development', 'proof', 'cta', 'closing', 'other')),
  notes text check (notes is null or char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  primary key (sequence_id, item_id),
  unique (sequence_id, narrative_order) deferrable initially immediate
);

create table public.template_sequence_links (
  template_id uuid not null references public.story_templates(template_id) on delete restrict,
  sequence_id uuid not null references public.story_sequences(sequence_id) on delete cascade,
  relationship text not null default 'applied' check (relationship in ('applied', 'inspiration', 'classification')),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (template_id, sequence_id)
);

create unique index story_templates_active_name_idx on public.story_templates(lower(btrim(name))) where status <> 'archived';
create index story_templates_status_updated_idx on public.story_templates(status, updated_at desc);
create index story_sequences_kind_state_updated_idx on public.story_sequences(kind, sequence_state, updated_at desc);
create index story_sequences_publication_queue_idx on public.story_sequences(publication_state, scheduled_for)
  where kind = 'publication' and publication_state in ('pending_approval', 'approved', 'scheduled', 'failed');
create index story_sequences_source_period_idx on public.story_sequences(source_started_at desc, sequence_id) where source_started_at is not null;
create index story_items_real_chronology_idx on public.story_items(source_occurred_at desc, item_id) where source_occurred_at is not null;
create unique index story_items_source_identity_idx on public.story_items(source_platform, source_item_id)
  where source_platform is not null and source_item_id is not null;
create index sequence_item_links_item_idx on public.sequence_item_links(item_id, sequence_id);
create index template_sequence_links_sequence_idx on public.template_sequence_links(sequence_id, template_id);
create unique index template_sequence_links_one_primary_idx on public.template_sequence_links(sequence_id) where is_primary;

insert into public.story_templates (name, description, objective, definition, tags, status)
select
  'Cena → lente → princípio',
  'Parte de um acontecimento concreto, muda a leitura da cena e termina revelando um princípio pessoal ou editorial.',
  'Transformar rotina em posicionamento sem abrir com uma aula.',
  '{"steps":[{"role":"hook","instruction":"Mostrar uma cena real, específica e reconhecível."},{"role":"development","instruction":"Aplicar humor, pergunta ou interpretação que muda a leitura da cena."},{"role":"closing","instruction":"Fechar com o princípio que orienta a escolha ou o posicionamento."}]}'::jsonb,
  array['cena real', 'posicionamento', 'story']::text[],
  'active'
where not exists (
  select 1 from public.story_templates
  where lower(btrim(name)) = lower('Cena → lente → princípio')
    and status <> 'archived'
);

create or replace function public.story_touch_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger story_templates_touch_updated_at before update on public.story_templates
for each row execute function public.story_touch_updated_at();
create trigger story_sequences_touch_updated_at before update on public.story_sequences
for each row execute function public.story_touch_updated_at();
create trigger story_items_touch_updated_at before update on public.story_items
for each row execute function public.story_touch_updated_at();

create or replace function public.story_invalidate_publication_revision(p_sequence_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.story_sequences
  set publication_state = 'draft',
      content_revision = content_revision + 1,
      approved_revision = null,
      approved_at = null,
      approved_by = null,
      review_note = null
  where sequence_id = p_sequence_id
    and kind = 'publication'
    and publication_state in ('draft', 'pending_approval', 'changes_requested', 'approved', 'failed');
end;
$$;

create or replace function public.story_content_change_invalidate_revision()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_sequence_id uuid;
begin
  if current_setting('app.story_suppress_revision_bump', true) = 'on' then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  if tg_table_name in ('sequence_item_links', 'template_sequence_links') then
    if tg_op = 'DELETE' then
      perform public.story_invalidate_publication_revision(old.sequence_id);
    elsif tg_op = 'INSERT' then
      perform public.story_invalidate_publication_revision(new.sequence_id);
    else
      perform public.story_invalidate_publication_revision(old.sequence_id);
      if new.sequence_id is distinct from old.sequence_id then
        perform public.story_invalidate_publication_revision(new.sequence_id);
      end if;
    end if;
  elsif tg_table_name = 'story_items' then
    for v_sequence_id in
      select distinct link.sequence_id
      from public.sequence_item_links link
      where link.item_id = case when tg_op = 'DELETE' then old.item_id else new.item_id end
    loop
      perform public.story_invalidate_publication_revision(v_sequence_id);
    end loop;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function public.story_sequence_content_invalidate_revision()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if current_setting('app.story_suppress_revision_bump', true) is distinct from 'on'
    and old.kind = 'publication'
    and old.publication_state in ('draft', 'pending_approval', 'changes_requested', 'approved', 'failed')
    and (
      new.title is distinct from old.title
      or new.description is distinct from old.description
      or new.platform is distinct from old.platform
      or new.scheduled_for is distinct from old.scheduled_for
    )
  then
    new.publication_state := 'draft';
    new.content_revision := old.content_revision + 1;
    new.approved_revision := null;
    new.approved_at := null;
    new.approved_by := null;
    new.review_note := null;
  end if;
  return new;
end;
$$;

create trigger story_sequences_content_invalidate_revision
before update on public.story_sequences
for each row execute function public.story_sequence_content_invalidate_revision();
create trigger sequence_item_links_invalidate_revision
after insert or update or delete on public.sequence_item_links
for each row execute function public.story_content_change_invalidate_revision();
create trigger template_sequence_links_invalidate_revision
after insert or update or delete on public.template_sequence_links
for each row execute function public.story_content_change_invalidate_revision();
create trigger story_items_invalidate_revision
after update or delete on public.story_items
for each row execute function public.story_content_change_invalidate_revision();

create or replace function public.story_create_reference(
  p_title text,
  p_description text,
  p_analysis jsonb,
  p_platform text,
  p_source_account text,
  p_source_url text,
  p_source_started_at timestamptz,
  p_source_ended_at timestamptz,
  p_template_id uuid,
  p_items jsonb,
  p_created_by uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_sequence_id uuid;
  v_item jsonb;
  v_item_id uuid;
  v_occurred_at timestamptz;
begin
  if not exists (select 1 from public.story_templates where template_id = p_template_id and status = 'active') then
    raise exception 'active template not found' using errcode = '23503';
  end if;
  if nullif(btrim(p_source_account), '') is null then
    raise exception 'reference source account required' using errcode = '23514';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 50 then
    raise exception 'reference requires between one and fifty stories' using errcode = '23514';
  end if;
  if p_analysis is null or jsonb_typeof(p_analysis) <> 'object' or octet_length(p_analysis::text) > 131072 then
    raise exception 'reference analysis must be a limited object' using errcode = '23514';
  end if;

  insert into public.story_sequences (
    kind, title, description, analysis, platform, source_account, source_url,
    source_started_at, source_ended_at, sequence_state, created_by
  ) values (
    'reference', p_title, p_description, p_analysis, p_platform, p_source_account, p_source_url,
    p_source_started_at, p_source_ended_at, 'closed', p_created_by
  ) returning sequence_id into v_sequence_id;

  insert into public.template_sequence_links (template_id, sequence_id, relationship, is_primary)
  values (p_template_id, v_sequence_id, 'inspiration', true);

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    if jsonb_typeof(v_item) <> 'object' then
      raise exception 'reference story must be an object' using errcode = '23514';
    end if;
    v_occurred_at := nullif(v_item ->> 'sourceOccurredAt', '')::timestamptz;
    if v_occurred_at is not null and p_source_started_at is not null and v_occurred_at < p_source_started_at then
      raise exception 'reference story occurred before sequence start' using errcode = '23514';
    end if;
    if v_occurred_at is not null and p_source_ended_at is not null and v_occurred_at > p_source_ended_at then
      raise exception 'reference story occurred after sequence end' using errcode = '23514';
    end if;
    insert into public.story_items (
      media_type, asset_url, text_content, metadata, source_occurred_at, source_platform, created_by
    ) values (
      v_item ->> 'mediaType',
      nullif(v_item ->> 'assetUrl', ''),
      nullif(v_item ->> 'textContent', ''),
      coalesce(v_item -> 'metadata', '{}'::jsonb),
      v_occurred_at,
      p_platform,
      p_created_by
    ) returning item_id into v_item_id;

    insert into public.sequence_item_links (sequence_id, item_id, narrative_order, narrative_role)
    values (
      v_sequence_id,
      v_item_id,
      (v_item ->> 'narrativeOrder')::integer,
      v_item ->> 'narrativeRole'
    );
  end loop;

  return v_sequence_id;
end;
$$;

-- Compatibility overload for existing forms and callers that predate structured analysis.
create or replace function public.story_create_reference(
  p_title text, p_description text, p_platform text, p_source_account text,
  p_source_url text, p_source_started_at timestamptz, p_source_ended_at timestamptz,
  p_template_id uuid, p_items jsonb, p_created_by uuid
)
returns uuid
language sql
security definer
set search_path = public, pg_temp
as $$
  select public.story_create_reference(
    p_title, p_description, '{}'::jsonb, p_platform, p_source_account, p_source_url,
    p_source_started_at, p_source_ended_at, p_template_id, p_items, p_created_by
  );
$$;

do $$
declare
  v_template_id uuid;
begin
  select template_id into v_template_id
  from public.story_templates
  where lower(name) = lower('Cena → lente → princípio')
  order by created_at
  limit 1;

  if v_template_id is not null and not exists (
    select 1
    from public.story_sequences
    where kind = 'reference'
      and title = 'Raul Sena, cena → humor → princípio'
      and source_url = 'https://www.instagram.com/_raulsena/'
  ) then
    perform public.story_create_reference(
      'Raul Sena, cena → humor → princípio',
      'Uma cena real e banal abre um pequeno conflito. O humor dá leitura ao episódio. O fechamento transforma a cena em princípio de identidade, sem virar aula.',
      'instagram',
      '@_raulsena',
      'https://www.instagram.com/_raulsena/',
      null,
      null,
      v_template_id,
      '[
        {"mediaType":"image","assetUrl":"https://opensquad-commercial-intelligence.pages.dev/story-references/raul-sena/01-conflito-no-aviao.jpg","textContent":"Cena concreta: o pedido de troca de assento cria conflito imediato e curiosidade.","narrativeOrder":1,"narrativeRole":"hook","sourceOccurredAt":null},
        {"mediaType":"image","assetUrl":"https://opensquad-commercial-intelligence.pages.dev/story-references/raul-sena/02-humor-e-reacao.jpg","textContent":"O humor dá uma lente pessoal para a cena e transforma a reação em entretenimento.","narrativeOrder":2,"narrativeRole":"development","sourceOccurredAt":null},
        {"mediaType":"image","assetUrl":"https://opensquad-commercial-intelligence.pages.dev/story-references/raul-sena/03-principio-e-identidade.jpg","textContent":"O fechamento responde à audiência e revela o princípio: frequência de viagem não obriga ostentação.","narrativeOrder":3,"narrativeRole":"closing","sourceOccurredAt":null}
      ]'::jsonb,
      null
    );
  end if;
end;
$$;

-- Dossiê metodológico aprovado: template rico + evidências canônicas do PDF.
insert into public.story_templates (name, description, objective, definition, tags, status)
select
  'História → pequena entrega → CTA',
  'Molde editorial aprovado que transforma uma história concreta em valor aplicado antes do convite.',
  'Criar tensão reconhecível, pagar a atenção com uma pequena entrega e fechar com um próximo passo coerente.',
  '{
    "formula":"História real → tensão → pequena entrega → CTA coerente",
    "risks":["Virar uma sequência genérica sem tensão concreta","Antecipar a entrega antes de a audiência entender o problema","Usar um CTA desconectado da história"],
    "preserveRules":["Preservar a progressão causal da história","Entregar valor antes do convite"],
    "adaptRules":["Trocar o contexto pela rotina editorial de Bruno e pela experiência adulta com TDAH","Reduzir carga cognitiva e usar uma ideia por tela"],
    "avoidRules":["Não copiar frases nem identidade visual da referência","Não expor pacientes ou prometer resultado clínico"],
    "moldSteps":[
      {"title":"História","purpose":"Abrir uma cena concreta e instalar uma tensão reconhecível."},
      {"title":"Tensão","purpose":"Nomear o custo ou pergunta que mantém a progressão."},
      {"title":"Pequena entrega","purpose":"Resolver uma parte útil com baixa carga cognitiva."},
      {"title":"CTA","purpose":"Convidar para o próximo passo natural e proporcional."}
    ],
    "steps":[
      {"role":"hook","instruction":"Contar uma história concreta em uma ideia por tela."},
      {"role":"context","instruction":"Explicitar a tensão sem antecipar a conclusão."},
      {"role":"development","instruction":"Fazer uma pequena entrega aplicável."},
      {"role":"cta","instruction":"Fechar com um CTA coerente com a entrega."}
    ]
  }'::jsonb,
  array['história','pequena entrega','cta','tdah']::text[],
  'active'
where not exists (
  select 1 from public.story_templates
  where lower(btrim(name)) = lower('História → pequena entrega → CTA') and status <> 'archived'
);

do $$
declare
  v_template_id uuid;
begin
  select template_id into v_template_id from public.story_templates
  where lower(btrim(name)) = lower('História → pequena entrega → CTA') and status <> 'archived'
  order by created_at limit 1;
  if v_template_id is not null and not exists (
    select 1 from public.story_sequences where kind = 'reference'
      and title = 'Stories para Enriquecer'
      and source_url = 'https://opensquad.com.br/stories-para-enriquecer.pdf'
  ) then
    perform public.story_create_reference(
      'Stories para Enriquecer',
      'Leitura metodológica das páginas 42–46: história, progressão de tópicos, pequena entrega, interação e CTA.',
      '{"summary":"Uma história pessoal prepara uma pequena entrega antes de um CTA proporcional.","narrativeArc":["história","tensão","pequena entrega","cta"],"whyItWorks":["A entrega paga a atenção antes do convite.","A progressão visual reduz a carga cognitiva."],"templateFit":"Referência canônica para o molde integrado aprovado."}'::jsonb,
      'other', '@storiesparaenriquecer', 'https://opensquad.com.br/stories-para-enriquecer.pdf', null, null,
      v_template_id,
      '[
        {"mediaType":"image","assetUrl":"https://opensquad-commercial-intelligence.pages.dev/story-references/stories-para-enriquecer/page-42.webp","textContent":"A história instala uma tensão antes de ensinar.","narrativeOrder":1,"narrativeRole":"hook","sourceOccurredAt":null,"metadata":{"sourcePage":42,"canonicalPageUrl":"https://opensquad.com.br/stories-para-enriquecer.pdf#page=42","canonicalPageAssetUrl":"https://opensquad-commercial-intelligence.pages.dev/story-references/stories-para-enriquecer/page-42.webp","evidenceType":"canonical_page","sourceExcerpt":"Comece pela história e pelo acontecimento concreto.","analysis":"A cena abre um loop e dá motivo para continuar.","criticism":"O contexto original pode ser longo para uma audiência com TDAH.","brunoAdaptation":"Usar uma cena clínica cotidiana sem identificar paciente e em uma ideia por tela.","editorialStatus":"approved","moldConsequence":"Reservar o primeiro movimento inteiro para a história concreta."}},
        {"mediaType":"image","assetUrl":"https://opensquad-commercial-intelligence.pages.dev/story-references/stories-para-enriquecer/page-43.webp","textContent":"A seta organiza tópicos em progressão causal.","narrativeOrder":2,"narrativeRole":"context","sourceOccurredAt":null,"metadata":{"sourcePage":43,"canonicalPageUrl":"https://opensquad.com.br/stories-para-enriquecer.pdf#page=43","canonicalPageAssetUrl":"https://opensquad-commercial-intelligence.pages.dev/story-references/stories-para-enriquecer/page-43.webp","evidenceType":"canonical_page","sourceExcerpt":"Conduza os tópicos como uma sequência, não como blocos soltos.","analysis":"A direção visual torna a progressão escaneável.","criticism":"Muitos tópicos simultâneos aumentam a carga cognitiva.","brunoAdaptation":"Limitar cada story a uma pergunta ou consequência sobre TDAH adulto.","editorialStatus":"approved_with_adaptation","moldConsequence":"Adicionar um movimento explícito de tensão entre história e entrega."}},
        {"mediaType":"image","assetUrl":"https://opensquad-commercial-intelligence.pages.dev/story-references/stories-para-enriquecer/page-44.webp","textContent":"A pequena entrega resolve parte da tensão antes do CTA.","narrativeOrder":3,"narrativeRole":"development","sourceOccurredAt":null,"metadata":{"sourcePage":44,"canonicalPageUrl":"https://opensquad.com.br/stories-para-enriquecer.pdf#page=44","canonicalPageAssetUrl":"https://opensquad-commercial-intelligence.pages.dev/story-references/stories-para-enriquecer/page-44.webp","evidenceType":"canonical_page","sourceExcerpt":"Entregue algo útil antes de chamar para a ação.","analysis":"A reciprocidade nasce de utilidade concreta, não de suspense vazio.","criticism":"Uma entrega ampla demais compete com o CTA.","brunoAdaptation":"Oferecer um microteste ou ajuste executável em menos de dois minutos.","editorialStatus":"approved","moldConsequence":"Tornar pequena entrega um movimento obrigatório do molde."}},
        {"mediaType":"image","assetUrl":"https://opensquad-commercial-intelligence.pages.dev/story-references/stories-para-enriquecer/page-45.webp","textContent":"A enquete transforma atenção em participação de baixo esforço.","narrativeOrder":4,"narrativeRole":"proof","sourceOccurredAt":null,"metadata":{"sourcePage":45,"canonicalPageUrl":"https://opensquad.com.br/stories-para-enriquecer.pdf#page=45","canonicalPageAssetUrl":"https://opensquad-commercial-intelligence.pages.dev/story-references/stories-para-enriquecer/page-45.webp","evidenceType":"canonical_page","sourceExcerpt":"Use interação para fazer a audiência se reconhecer.","analysis":"A enquete gera autoidentificação e sinal editorial.","criticism":"Alternativas binárias podem simplificar uma experiência clínica complexa.","brunoAdaptation":"Perguntar sobre experiência cotidiana, sem enquete diagnóstica.","editorialStatus":"approved_with_adaptation","moldConsequence":"Interação é recurso opcional depois da entrega, nunca diagnóstico."}},
        {"mediaType":"image","assetUrl":"https://opensquad-commercial-intelligence.pages.dev/story-references/stories-para-enriquecer/page-46.webp","textContent":"O CTA fecha a mesma promessa aberta pela história.","narrativeOrder":5,"narrativeRole":"cta","sourceOccurredAt":null,"metadata":{"sourcePage":46,"canonicalPageUrl":"https://opensquad.com.br/stories-para-enriquecer.pdf#page=46","canonicalPageAssetUrl":"https://opensquad-commercial-intelligence.pages.dev/story-references/stories-para-enriquecer/page-46.webp","evidenceType":"canonical_page","sourceExcerpt":"Convide para o próximo passo coerente com a sequência.","analysis":"O CTA funciona porque continua a conversa em vez de interrompê-la.","criticism":"Urgência artificial quebraria a confiança construída.","brunoAdaptation":"Convidar para salvar, responder ou acessar material diretamente ligado à microentrega.","editorialStatus":"approved","moldConsequence":"Validar o CTA pela continuidade semântica com história e entrega."}}
      ]'::jsonb,
      null
    );
  end if;
end;
$$;

create or replace function public.story_create_publication(
  p_title text,
  p_template_id uuid,
  p_scheduled_for timestamptz,
  p_items jsonb,
  p_created_by uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_sequence_id uuid;
  v_item jsonb;
  v_item_id uuid;
  v_previous_revision_suppression text;
begin
  v_previous_revision_suppression := current_setting('app.story_suppress_revision_bump', true);
  if not exists (select 1 from public.story_templates where template_id = p_template_id and status = 'active') then
    raise exception 'active template not found' using errcode = '23503';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 then
    raise exception 'publication requires at least one story' using errcode = '23514';
  end if;
  perform set_config('app.story_suppress_revision_bump', 'on', true);

  insert into public.story_sequences (
    kind, title, sequence_state, publication_state, scheduled_for, created_by
  ) values (
    'publication', p_title, 'closed', 'draft', p_scheduled_for, p_created_by
  ) returning sequence_id into v_sequence_id;

  insert into public.template_sequence_links (template_id, sequence_id, relationship, is_primary)
  values (p_template_id, v_sequence_id, 'applied', true);

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    insert into public.story_items (media_type, asset_url, text_content, created_by)
    values (
      v_item ->> 'mediaType',
      nullif(v_item ->> 'assetUrl', ''),
      nullif(v_item ->> 'textContent', ''),
      p_created_by
    ) returning item_id into v_item_id;

    insert into public.sequence_item_links (sequence_id, item_id, narrative_order, narrative_role)
    values (
      v_sequence_id,
      v_item_id,
      (v_item ->> 'narrativeOrder')::integer,
      v_item ->> 'narrativeRole'
    );
  end loop;

  perform set_config('app.story_suppress_revision_bump', coalesce(v_previous_revision_suppression, 'off'), true);
  return v_sequence_id;
exception when others then
  perform set_config('app.story_suppress_revision_bump', coalesce(v_previous_revision_suppression, 'off'), true);
  raise;
end;
$$;

create or replace function public.story_update_publication(
  p_sequence_id uuid,
  p_expected_revision integer,
  p_title text,
  p_template_id uuid,
  p_scheduled_for timestamptz,
  p_items jsonb,
  p_updated_by uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_sequence_id uuid;
  v_item jsonb;
  v_item_id uuid;
  v_old_item_ids uuid[];
  v_previous_revision_suppression text;
begin
  v_previous_revision_suppression := current_setting('app.story_suppress_revision_bump', true);
  if not exists (select 1 from public.story_templates where template_id = p_template_id and status = 'active') then
    raise exception 'active template not found' using errcode = '23503';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 then
    raise exception 'publication requires at least one story' using errcode = '23514';
  end if;

  select sequence_id into v_sequence_id
  from public.story_sequences
  where sequence_id = p_sequence_id
    and kind = 'publication'
    and publication_state in ('draft', 'changes_requested', 'approved', 'failed')
    and content_revision = p_expected_revision
  for update;
  if v_sequence_id is null then
    raise exception 'publication revision conflict or invalid state' using errcode = '40001';
  end if;

  select array_agg(item_id) into v_old_item_ids
  from public.sequence_item_links
  where sequence_id = v_sequence_id;

  perform set_config('app.story_suppress_revision_bump', 'on', true);
  update public.story_sequences
  set title = p_title,
      scheduled_for = p_scheduled_for,
      publication_state = 'draft',
      content_revision = content_revision + 1,
      approved_revision = null,
      approved_at = null,
      approved_by = null,
      review_note = null
  where sequence_id = v_sequence_id;

  delete from public.template_sequence_links where sequence_id = v_sequence_id and is_primary;
  insert into public.template_sequence_links (template_id, sequence_id, relationship, is_primary)
  values (p_template_id, v_sequence_id, 'applied', true)
  on conflict (template_id, sequence_id) do update
  set relationship = excluded.relationship, is_primary = true;

  delete from public.sequence_item_links where sequence_id = v_sequence_id;
  for v_item in select value from jsonb_array_elements(p_items)
  loop
    insert into public.story_items (media_type, asset_url, text_content, created_by)
    values (
      v_item ->> 'mediaType',
      nullif(v_item ->> 'assetUrl', ''),
      nullif(v_item ->> 'textContent', ''),
      p_updated_by
    ) returning item_id into v_item_id;
    insert into public.sequence_item_links (sequence_id, item_id, narrative_order, narrative_role)
    values (
      v_sequence_id,
      v_item_id,
      (v_item ->> 'narrativeOrder')::integer,
      v_item ->> 'narrativeRole'
    );
  end loop;

  delete from public.story_items item
  where item.item_id = any(coalesce(v_old_item_ids, array[]::uuid[]))
    and not exists (select 1 from public.sequence_item_links link where link.item_id = item.item_id);
  perform set_config('app.story_suppress_revision_bump', coalesce(v_previous_revision_suppression, 'off'), true);
  return v_sequence_id;
exception when others then
  perform set_config('app.story_suppress_revision_bump', coalesce(v_previous_revision_suppression, 'off'), true);
  raise;
end;
$$;

create or replace function public.story_request_publication_approval(
  p_sequence_id uuid,
  p_expected_revision integer
)
returns public.story_sequences
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_sequence public.story_sequences;
begin
  update public.story_sequences
  set publication_state = 'pending_approval', review_note = null
  where sequence_id = p_sequence_id
    and kind = 'publication'
    and publication_state in ('draft', 'changes_requested')
    and content_revision = p_expected_revision
  returning * into v_sequence;
  if v_sequence.sequence_id is null then
    raise exception 'publication revision conflict or invalid state' using errcode = '40001';
  end if;
  return v_sequence;
end;
$$;

create or replace function public.story_review_publication(
  p_sequence_id uuid,
  p_expected_revision integer,
  p_decision text,
  p_note text,
  p_reviewer uuid
)
returns public.story_sequences
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_sequence public.story_sequences;
begin
  if p_decision not in ('approved', 'changes_requested') then
    raise exception 'invalid review decision' using errcode = '22023';
  end if;
  if p_decision = 'changes_requested' and nullif(btrim(p_note), '') is null then
    raise exception 'review note required' using errcode = '23514';
  end if;

  update public.story_sequences
  set publication_state = p_decision,
      review_note = nullif(btrim(p_note), ''),
      approved_at = case when p_decision = 'approved' then now() else null end,
      approved_by = case when p_decision = 'approved' then p_reviewer else null end,
      approved_revision = case when p_decision = 'approved' then content_revision else null end
  where sequence_id = p_sequence_id
    and kind = 'publication'
    and publication_state = 'pending_approval'
    and content_revision = p_expected_revision
  returning * into v_sequence;
  if v_sequence.sequence_id is null then
    raise exception 'publication revision conflict or invalid state' using errcode = '40001';
  end if;
  return v_sequence;
end;
$$;

alter table public.story_templates enable row level security;
alter table public.story_sequences enable row level security;
alter table public.story_items enable row level security;
alter table public.sequence_item_links enable row level security;
alter table public.template_sequence_links enable row level security;

revoke all on table public.story_templates from anon, authenticated;
revoke all on table public.story_sequences from anon, authenticated;
revoke all on table public.story_items from anon, authenticated;
revoke all on table public.sequence_item_links from anon, authenticated;
revoke all on table public.template_sequence_links from anon, authenticated;
revoke all on function public.story_create_reference(text, text, jsonb, text, text, text, timestamptz, timestamptz, uuid, jsonb, uuid) from public, anon, authenticated;
revoke all on function public.story_create_reference(text, text, text, text, text, timestamptz, timestamptz, uuid, jsonb, uuid) from public, anon, authenticated;
revoke all on function public.story_create_publication(text, uuid, timestamptz, jsonb, uuid) from public, anon, authenticated;
revoke all on function public.story_update_publication(uuid, integer, text, uuid, timestamptz, jsonb, uuid) from public, anon, authenticated;
revoke all on function public.story_request_publication_approval(uuid, integer) from public, anon, authenticated;
revoke all on function public.story_review_publication(uuid, integer, text, text, uuid) from public, anon, authenticated;
revoke all on function public.story_invalidate_publication_revision(uuid) from public, anon, authenticated;
revoke all on function public.story_content_change_invalidate_revision() from public, anon, authenticated;
revoke all on function public.story_sequence_content_invalidate_revision() from public, anon, authenticated;

grant select, insert on table public.story_templates to service_role;
grant select on table public.story_sequences to service_role;
grant select on table public.story_items to service_role;
grant select on table public.sequence_item_links to service_role;
grant select on table public.template_sequence_links to service_role;
grant execute on function public.story_create_reference(text, text, jsonb, text, text, text, timestamptz, timestamptz, uuid, jsonb, uuid) to service_role;
grant execute on function public.story_create_reference(text, text, text, text, text, timestamptz, timestamptz, uuid, jsonb, uuid) to service_role;
grant execute on function public.story_create_publication(text, uuid, timestamptz, jsonb, uuid) to service_role;
grant execute on function public.story_update_publication(uuid, integer, text, uuid, timestamptz, jsonb, uuid) to service_role;
grant execute on function public.story_request_publication_approval(uuid, integer) to service_role;
grant execute on function public.story_review_publication(uuid, integer, text, text, uuid) to service_role;

commit;
