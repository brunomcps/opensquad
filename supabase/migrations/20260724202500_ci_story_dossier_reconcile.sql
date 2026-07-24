begin;

-- Reconcile the canonical dossier when 20260724195500 found a reference that
-- already existed. That migration remains the sole owner of creating the
-- template/reference/items; this one only repairs the existing graph.
do $$
declare
  v_sequence_id uuid;
  v_template_id uuid;
  v_missing_orders integer[];
begin
  select sequence_id into v_sequence_id
  from public.story_sequences
  where kind = 'reference'
    and title = 'Stories para Enriquecer'
    and source_url = 'https://opensquad.com.br/stories-para-enriquecer.pdf'
  order by created_at, sequence_id
  limit 1
  for update;

  -- Do not create a second reference. The preceding migration creates it when
  -- absent, and a no-op here keeps that ownership explicit.
  if v_sequence_id is null then
    return;
  end if;

  select template_id into v_template_id
  from public.story_templates
  where lower(btrim(name)) = lower('História → pequena entrega → CTA')
    and status <> 'archived'
  order by created_at, template_id
  limit 1;

  if v_template_id is null then
    raise exception 'cannot reconcile Stories para Enriquecer: template História → pequena entrega → CTA is missing'
      using errcode = '23503';
  end if;

  select array_agg(required_order order by required_order) into v_missing_orders
  from generate_series(1, 5) as required_order
  where not exists (
    select 1
    from public.sequence_item_links link
    where link.sequence_id = v_sequence_id
      and link.narrative_order = required_order
  );

  if coalesce(cardinality(v_missing_orders), 0) > 0 then
    raise exception 'cannot reconcile Stories para Enriquecer: missing narrative_order(s): %',
      array_to_string(v_missing_orders, ', ')
      using errcode = '23514';
  end if;

  -- Make the approved mold the sole primary link, without duplicating the
  -- composite-keyed relationship on reruns.
  update public.template_sequence_links
  set is_primary = false
  where sequence_id = v_sequence_id
    and template_id <> v_template_id
    and is_primary;

  insert into public.template_sequence_links (
    template_id, sequence_id, relationship, is_primary
  ) values (
    v_template_id, v_sequence_id, 'inspiration', true
  )
  on conflict (template_id, sequence_id) do update
  set relationship = excluded.relationship,
      is_primary = excluded.is_primary;

  update public.story_items item
  set asset_url = dossier.asset_url,
      text_content = dossier.text_content,
      metadata = dossier.metadata
  from public.sequence_item_links link
  join (
    values
      (1,
       'https://opensquad-commercial-intelligence.pages.dev/story-references/stories-para-enriquecer/page-42.webp',
       'A história instala uma tensão antes de ensinar.',
       '{"sourcePage":42,"canonicalPageUrl":"https://opensquad.com.br/stories-para-enriquecer.pdf#page=42","canonicalPageAssetUrl":"https://opensquad-commercial-intelligence.pages.dev/story-references/stories-para-enriquecer/page-42.webp","evidenceType":"canonical_page","sourceExcerpt":"Comece pela história e pelo acontecimento concreto.","analysis":"A cena abre um loop e dá motivo para continuar.","criticism":"O contexto original pode ser longo para uma audiência com TDAH.","brunoAdaptation":"Usar uma cena clínica cotidiana sem identificar paciente e em uma ideia por tela.","editorialStatus":"approved","moldConsequence":"Reservar o primeiro movimento inteiro para a história concreta."}'::jsonb),
      (2,
       'https://opensquad-commercial-intelligence.pages.dev/story-references/stories-para-enriquecer/page-43.webp',
       'A seta organiza tópicos em progressão causal.',
       '{"sourcePage":43,"canonicalPageUrl":"https://opensquad.com.br/stories-para-enriquecer.pdf#page=43","canonicalPageAssetUrl":"https://opensquad-commercial-intelligence.pages.dev/story-references/stories-para-enriquecer/page-43.webp","evidenceType":"canonical_page","sourceExcerpt":"Conduza os tópicos como uma sequência, não como blocos soltos.","analysis":"A direção visual torna a progressão escaneável.","criticism":"Muitos tópicos simultâneos aumentam a carga cognitiva.","brunoAdaptation":"Limitar cada story a uma pergunta ou consequência sobre TDAH adulto.","editorialStatus":"approved_with_adaptation","moldConsequence":"Adicionar um movimento explícito de tensão entre história e entrega."}'::jsonb),
      (3,
       'https://opensquad-commercial-intelligence.pages.dev/story-references/stories-para-enriquecer/page-44.webp',
       'A pequena entrega resolve parte da tensão antes do CTA.',
       '{"sourcePage":44,"canonicalPageUrl":"https://opensquad.com.br/stories-para-enriquecer.pdf#page=44","canonicalPageAssetUrl":"https://opensquad-commercial-intelligence.pages.dev/story-references/stories-para-enriquecer/page-44.webp","evidenceType":"canonical_page","sourceExcerpt":"Entregue algo útil antes de chamar para a ação.","analysis":"A reciprocidade nasce de utilidade concreta, não de suspense vazio.","criticism":"Uma entrega ampla demais compete com o CTA.","brunoAdaptation":"Oferecer um microteste ou ajuste executável em menos de dois minutos.","editorialStatus":"approved","moldConsequence":"Tornar pequena entrega um movimento obrigatório do molde."}'::jsonb),
      (4,
       'https://opensquad-commercial-intelligence.pages.dev/story-references/stories-para-enriquecer/page-45.webp',
       'A enquete transforma atenção em participação de baixo esforço.',
       '{"sourcePage":45,"canonicalPageUrl":"https://opensquad.com.br/stories-para-enriquecer.pdf#page=45","canonicalPageAssetUrl":"https://opensquad-commercial-intelligence.pages.dev/story-references/stories-para-enriquecer/page-45.webp","evidenceType":"canonical_page","sourceExcerpt":"Use interação para fazer a audiência se reconhecer.","analysis":"A enquete gera autoidentificação e sinal editorial.","criticism":"Alternativas binárias podem simplificar uma experiência clínica complexa.","brunoAdaptation":"Perguntar sobre experiência cotidiana, sem enquete diagnóstica.","editorialStatus":"approved_with_adaptation","moldConsequence":"Interação é recurso opcional depois da entrega, nunca diagnóstico."}'::jsonb),
      (5,
       'https://opensquad-commercial-intelligence.pages.dev/story-references/stories-para-enriquecer/page-46.webp',
       'O CTA fecha a mesma promessa aberta pela história.',
       '{"sourcePage":46,"canonicalPageUrl":"https://opensquad.com.br/stories-para-enriquecer.pdf#page=46","canonicalPageAssetUrl":"https://opensquad-commercial-intelligence.pages.dev/story-references/stories-para-enriquecer/page-46.webp","evidenceType":"canonical_page","sourceExcerpt":"Convide para o próximo passo coerente com a sequência.","analysis":"O CTA funciona porque continua a conversa em vez de interrompê-la.","criticism":"Urgência artificial quebraria a confiança construída.","brunoAdaptation":"Convidar para salvar, responder ou acessar material diretamente ligado à microentrega.","editorialStatus":"approved","moldConsequence":"Validar o CTA pela continuidade semântica com história e entrega."}'::jsonb)
  ) as dossier(narrative_order, asset_url, text_content, metadata)
    on dossier.narrative_order = link.narrative_order
  where link.sequence_id = v_sequence_id
    and item.item_id = link.item_id;
end;
$$;

commit;
