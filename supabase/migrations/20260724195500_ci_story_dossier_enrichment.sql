begin;

-- 20260724120000_ci_story_content.sql is already applied remotely. Keep this
-- migration strictly additive: enrich the existing five-entity model in place.
alter table public.story_sequences
  add column if not exists analysis jsonb not null default '{}'::jsonb;

alter table public.story_items
  add column if not exists metadata jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.story_sequences'::regclass
      and conname = 'story_sequences_analysis_object_check'
  ) then
    alter table public.story_sequences
      add constraint story_sequences_analysis_object_check
      check (jsonb_typeof(analysis) = 'object');
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.story_sequences'::regclass
      and conname = 'story_sequences_analysis_size_check'
  ) then
    alter table public.story_sequences
      add constraint story_sequences_analysis_size_check
      check (octet_length(analysis::text) <= 131072);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.story_items'::regclass
      and conname = 'story_items_metadata_object_check'
  ) then
    alter table public.story_items
      add constraint story_items_metadata_object_check
      check (jsonb_typeof(metadata) = 'object');
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.story_items'::regclass
      and conname = 'story_items_metadata_size_check'
  ) then
    alter table public.story_items
      add constraint story_items_metadata_size_check
      check (octet_length(metadata::text) <= 131072);
  end if;
end;
$$;

-- Rich overload used by the Edge function. The pre-enrichment ten-argument RPC
-- remains available below and delegates with an empty analysis object.
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
    values (v_sequence_id, v_item_id, (v_item ->> 'narrativeOrder')::integer, v_item ->> 'narrativeRole');
  end loop;

  return v_sequence_id;
end;
$$;

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

revoke all on function public.story_create_reference(text, text, jsonb, text, text, text, timestamptz, timestamptz, uuid, jsonb, uuid) from public, anon, authenticated;
revoke all on function public.story_create_reference(text, text, text, text, text, timestamptz, timestamptz, uuid, jsonb, uuid) from public, anon, authenticated;
grant execute on function public.story_create_reference(text, text, jsonb, text, text, text, timestamptz, timestamptz, uuid, jsonb, uuid) to service_role;
grant execute on function public.story_create_reference(text, text, text, text, text, timestamptz, timestamptz, uuid, jsonb, uuid) to service_role;

-- Approved integrated mold. UPDATE makes a rerun converge if a prior attempt
-- inserted the named seed; INSERT covers databases that only have the base seed.
update public.story_templates
set description = 'Molde editorial aprovado que transforma uma história concreta em valor aplicado antes do convite.',
    objective = 'Criar tensão reconhecível, pagar a atenção com uma pequena entrega e fechar com um próximo passo coerente.',
    definition = '{
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
    tags = array['história','pequena entrega','cta','tdah']::text[],
    status = 'active'
where lower(btrim(name)) = lower('História → pequena entrega → CTA')
  and status <> 'archived';

insert into public.story_templates (name, description, objective, definition, tags, status)
select
  'História → pequena entrega → CTA',
  'Molde editorial aprovado que transforma uma história concreta em valor aplicado antes do convite.',
  'Criar tensão reconhecível, pagar a atenção com uma pequena entrega e fechar com um próximo passo coerente.',
  '{"formula":"História real → tensão → pequena entrega → CTA coerente","risks":["Virar uma sequência genérica sem tensão concreta","Antecipar a entrega antes de a audiência entender o problema","Usar um CTA desconectado da história"],"preserveRules":["Preservar a progressão causal da história","Entregar valor antes do convite"],"adaptRules":["Trocar o contexto pela rotina editorial de Bruno e pela experiência adulta com TDAH","Reduzir carga cognitiva e usar uma ideia por tela"],"avoidRules":["Não copiar frases nem identidade visual da referência","Não expor pacientes ou prometer resultado clínico"],"moldSteps":[{"title":"História","purpose":"Abrir uma cena concreta e instalar uma tensão reconhecível."},{"title":"Tensão","purpose":"Nomear o custo ou pergunta que mantém a progressão."},{"title":"Pequena entrega","purpose":"Resolver uma parte útil com baixa carga cognitiva."},{"title":"CTA","purpose":"Convidar para o próximo passo natural e proporcional."}],"steps":[{"role":"hook","instruction":"Contar uma história concreta em uma ideia por tela."},{"role":"context","instruction":"Explicitar a tensão sem antecipar a conclusão."},{"role":"development","instruction":"Fazer uma pequena entrega aplicável."},{"role":"cta","instruction":"Fechar com um CTA coerente com a entrega."}]}'::jsonb,
  array['história','pequena entrega','cta','tdah']::text[],
  'active'
where not exists (
  select 1 from public.story_templates
  where lower(btrim(name)) = lower('História → pequena entrega → CTA') and status <> 'archived'
);

do $$
declare
  v_template_id uuid;
  v_sequence_id uuid;
begin
  select template_id into v_template_id
  from public.story_templates
  where lower(btrim(name)) = lower('História → pequena entrega → CTA') and status <> 'archived'
  order by created_at limit 1;

  select sequence_id into v_sequence_id
  from public.story_sequences
  where kind = 'reference'
    and title = 'Stories para Enriquecer'
    and source_url = 'https://opensquad.com.br/stories-para-enriquecer.pdf'
  order by created_at limit 1;

  if v_sequence_id is null then
    v_sequence_id := public.story_create_reference(
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
  else
    update public.story_sequences
    set description = 'Leitura metodológica das páginas 42–46: história, progressão de tópicos, pequena entrega, interação e CTA.',
        analysis = '{"summary":"Uma história pessoal prepara uma pequena entrega antes de um CTA proporcional.","narrativeArc":["história","tensão","pequena entrega","cta"],"whyItWorks":["A entrega paga a atenção antes do convite.","A progressão visual reduz a carga cognitiva."],"templateFit":"Referência canônica para o molde integrado aprovado."}'::jsonb
    where sequence_id = v_sequence_id;
  end if;
end;
$$;

commit;
