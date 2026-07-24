begin;

-- Recover the dedicated Raul Sena mold and its reference without changing the
-- independent "História → pequena entrega → CTA" dossier.
do $$
declare
  v_template_id uuid;
  v_sequence_id uuid;
  v_item_id uuid;
  v_story record;
begin
  select template_id into v_template_id
  from public.story_templates
  where lower(btrim(name)) = lower('Cena → lente → princípio')
    and status <> 'archived'
  order by created_at, template_id
  limit 1
  for update;

  if v_template_id is null then
    select template_id into v_template_id
    from public.story_templates
    where lower(btrim(name)) = lower('Cena → lente → princípio')
    order by created_at, template_id
    limit 1
    for update;
  end if;

  if v_template_id is null then
    insert into public.story_templates (
      name, description, objective, definition, tags, status
    ) values (
      'Cena → lente → princípio',
      'Parte de um acontecimento concreto, muda a leitura da cena e termina revelando um princípio pessoal ou editorial.',
      'Transformar rotina em posicionamento sem abrir com uma aula.',
      '{
        "steps":[
          {"role":"hook","instruction":"Mostrar uma cena real, específica e reconhecível."},
          {"role":"development","instruction":"Aplicar humor, pergunta ou interpretação que muda a leitura da cena."},
          {"role":"closing","instruction":"Fechar com o princípio que orienta a escolha ou o posicionamento."}
        ]
      }'::jsonb,
      array['cena real', 'posicionamento', 'story']::text[],
      'active'
    )
    returning template_id into v_template_id;
  else
    update public.story_templates
    set name = 'Cena → lente → princípio',
        description = 'Parte de um acontecimento concreto, muda a leitura da cena e termina revelando um princípio pessoal ou editorial.',
        objective = 'Transformar rotina em posicionamento sem abrir com uma aula.',
        definition = '{
          "steps":[
            {"role":"hook","instruction":"Mostrar uma cena real, específica e reconhecível."},
            {"role":"development","instruction":"Aplicar humor, pergunta ou interpretação que muda a leitura da cena."},
            {"role":"closing","instruction":"Fechar com o princípio que orienta a escolha ou o posicionamento."}
          ]
        }'::jsonb,
        tags = array['cena real', 'posicionamento', 'story']::text[],
        status = 'active'
    where template_id = v_template_id;
  end if;

  select sequence_id into v_sequence_id
  from public.story_sequences
  where kind = 'reference'
    and (
      source_url = 'https://www.instagram.com/_raulsena/'
      or title = 'Raul Sena, cena → humor → princípio'
    )
  order by
    (source_url = 'https://www.instagram.com/_raulsena/') desc,
    created_at,
    sequence_id
  limit 1
  for update;

  if v_sequence_id is null then
    insert into public.story_sequences (
      kind, title, description, analysis, platform, source_account, source_url,
      sequence_state
    ) values (
      'reference',
      'Raul Sena, cena → humor → princípio',
      'A sequência parte de uma situação banal no avião, usa humor financeiro para pagar o gancho e fecha com uma declaração de princípio sobre dinheiro. A referência ensina a transformar rotina em posicionamento sem abrir com uma aula.',
      '{"summary":"Uma cena cotidiana vira humor de nicho e termina como princípio de posicionamento."}'::jsonb,
      'instagram',
      '@_raulsena',
      'https://www.instagram.com/_raulsena/',
      'closed'
    )
    returning sequence_id into v_sequence_id;
  else
    update public.story_sequences
    set title = 'Raul Sena, cena → humor → princípio',
        description = 'A sequência parte de uma situação banal no avião, usa humor financeiro para pagar o gancho e fecha com uma declaração de princípio sobre dinheiro. A referência ensina a transformar rotina em posicionamento sem abrir com uma aula.',
        analysis = '{"summary":"Uma cena cotidiana vira humor de nicho e termina como princípio de posicionamento."}'::jsonb,
        platform = 'instagram',
        source_account = '@_raulsena',
        source_url = 'https://www.instagram.com/_raulsena/',
        sequence_state = 'closed'
    where sequence_id = v_sequence_id;
  end if;

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

  for v_story in
    select *
    from (
      values
        (
          1,
          'hook',
          'https://opensquad-commercial-intelligence.pages.dev/story-references/raul-sena/01-conflito-no-aviao.jpg',
          'Abre com uma cena cotidiana e reconhecível: a família quer trocar de assento. O conflito é pequeno, concreto e segura a curiosidade.'
        ),
        (
          2,
          'development',
          'https://opensquad-commercial-intelligence.pages.dev/story-references/raul-sena/02-humor-e-inss.jpg',
          'Paga a curiosidade com humor de nicho. A troca de assento vira uma piada financeira sobre uma criança a mais colaborando com o INSS.'
        ),
        (
          3,
          'closing',
          'https://opensquad-commercial-intelligence.pages.dev/story-references/raul-sena/03-principio-do-jato.jpg',
          'Fecha com uma lente de mundo: mesmo voando toda semana, ele prefere usar o dinheiro de outras formas. A cena termina em princípio e posicionamento.'
        )
    ) as story(narrative_order, narrative_role, asset_url, text_content)
  loop
    select item_id into v_item_id
    from public.sequence_item_links
    where sequence_id = v_sequence_id
      and narrative_order = v_story.narrative_order
    limit 1;

    if v_item_id is null then
      insert into public.story_items (
        media_type, asset_url, text_content, source_platform
      ) values (
        'image', v_story.asset_url, v_story.text_content, 'instagram'
      )
      returning item_id into v_item_id;

      insert into public.sequence_item_links (
        sequence_id, item_id, narrative_order, narrative_role
      ) values (
        v_sequence_id, v_item_id, v_story.narrative_order, v_story.narrative_role
      );
    else
      update public.story_items
      set media_type = 'image',
          asset_url = v_story.asset_url,
          text_content = v_story.text_content,
          source_platform = 'instagram'
      where item_id = v_item_id;

      update public.sequence_item_links
      set narrative_role = v_story.narrative_role
      where sequence_id = v_sequence_id
        and item_id = v_item_id;
    end if;
  end loop;
end;
$$;

commit;
