begin;

-- Add presentation-only layers to the canonical Raul Sena dossier. Every
-- selector excludes the independent "História → pequena entrega → CTA"
-- template and its reference.
do $$
declare
  v_template_ids uuid[];
  v_sequence_ids uuid[];
  v_template_id uuid;
  v_sequence_id uuid;
  v_updated_items integer;
begin
  select array_agg(template_id order by created_at, template_id)
  into v_template_ids
  from public.story_templates
  where lower(btrim(name)) = lower('Cena → lente → princípio');

  if coalesce(cardinality(v_template_ids), 0) <> 1 then
    raise exception 'cannot add Raul Sena dossier fidelity: expected one canonical template, found %',
      coalesce(cardinality(v_template_ids), 0)
      using errcode = '23514';
  end if;
  v_template_id := v_template_ids[1];

  select array_agg(sequence_id order by created_at, sequence_id)
  into v_sequence_ids
  from public.story_sequences
  where kind = 'reference'
    and source_url = 'https://www.instagram.com/_raulsena/';

  if coalesce(cardinality(v_sequence_ids), 0) <> 1 then
    raise exception 'cannot add Raul Sena dossier fidelity: expected one canonical reference, found %',
      coalesce(cardinality(v_sequence_ids), 0)
      using errcode = '23514';
  end if;
  v_sequence_id := v_sequence_ids[1];

  perform 1
  from public.story_templates
  where template_id = v_template_id
  for update;

  perform 1
  from public.story_sequences
  where sequence_id = v_sequence_id
  for update;

  if not exists (
    select 1
    from public.template_sequence_links
    where template_id = v_template_id
      and sequence_id = v_sequence_id
      and is_primary
  ) then
    raise exception 'cannot add Raul Sena dossier fidelity: canonical primary link is missing'
      using errcode = '23503';
  end if;

  update public.story_templates
  set definition = definition || $json$
      {
        "editorialName":"Cena comum → lente do especialista → valor pessoal",
        "editorialSummary":"Raul Sena · 3 telas · dossiê completo"
      }
      $json$::jsonb,
      updated_at = now()
  where template_id = v_template_id;

  update public.story_sequences
  set analysis = analysis || $json$
      {
        "synthesis":[
          {
            "title":"Papel de cada tela",
            "paragraphs":[
              "Story 1: identificação e curiosidade.",
              "Story 2: recompensa, humor e autoridade.",
              "Story 3: prova social, posicionamento e confiança."
            ]
          },
          {
            "title":"Mudança de estímulo",
            "paragraphs":[
              "Rosto → ambiente com gráfico → ambiente com print de seguidor."
            ]
          },
          {
            "title":"Estética e produção",
            "paragraphs":[
              "Selfie, câmera no chão, print de mensagem e texto nativo do Instagram."
            ]
          },
          {
            "title":"Forças e limitações",
            "paragraphs":[
              "A sequência combina prova visual, humor, autoridade indireta e status atribuído por terceiro.",
              "O gráfico é pouco legível e a piada depende de contexto."
            ]
          }
        ],
        "registeredTemplate":{
          "name":"Cena comum → lente do especialista → valor pessoal",
          "steps":[
            {
              "title":"Cena real com pequeno conflito",
              "description":"Acontecimento banal, específico e visualmente comprovável."
            },
            {
              "title":"Virada de nicho",
              "description":"Piada, dado ou interpretação que somente aquele especialista faria."
            },
            {
              "title":"Resposta do público",
              "description":"Comentário ou mensagem vira continuação narrativa."
            },
            {
              "title":"Declaração de princípio",
              "description":"A resposta revela como o criador pensa e toma decisões."
            }
          ]
        },
        "sourceNote":"Referência fundadora: sequência de 3 stories de Raul Sena. Análise vinculada ao template, sem separar referência e abstração."
      }
      $json$::jsonb,
      updated_at = now()
  where sequence_id = v_sequence_id;

  update public.story_items item
  set metadata = item.metadata || jsonb_build_object(
    'quick', dossier.quick,
    'deep', dossier.deep
  )
  from public.sequence_item_links link
  join (
    values
      (
        1,
        $json$
        {
          "roleLabel":"Story 1 · Identificação e curiosidade",
          "title":"A cena já contém a pergunta narrativa",
          "summary":"Uma situação cotidiana e comprovável abre uma pergunta antes da decisão.",
          "evidence":"O número “uma vez a cada 10 voos” dá aparência de observação real.",
          "audienceEffect":"A frase para antes da decisão e produz: “ele troca ou se recusa?”",
          "subtext":"A viagem comunica status, mas o assunto permanece cotidiano e acessível.",
          "funnelFunction":"Relacionamento. A situação discutível convida respostas espontâneas.",
          "extractedRule":"Comece por uma cena banal, específica e visualmente comprovável que já abra uma pergunta."
        }
        $json$::jsonb,
        $json$
        {
          "roleLabel":"Story 1 · Identificação e curiosidade",
          "title":"A cena e o gancho",
          "lead":"Selfie no avião, uma família ao fundo e um dado específico. A pessoa entra pela situação concreta e quer descobrir como Raul vai reagir ao pedido de troca.",
          "sections":[
            {
              "title":"O que ele faz aqui",
              "bullets":[
                "Usa uma situação reconhecível e levemente incômoda.",
                "Coloca um número específico, “uma vez a cada 10 voos”, que parece uma observação real.",
                "A família ao fundo comprova visualmente a história.",
                "O dedo chama atenção para o fundo e orienta o olhar.",
                "A frase termina antes da opinião dele e cria a pergunta: ele troca ou se recusa?",
                "A viagem comunica status sem virar o assunto principal."
              ]
            },
            {
              "title":"Função narrativa",
              "paragraphs":[
                "É a abertura da novela. A pessoa avança para descobrir a decisão dele e para comparar com a própria: “Eu trocaria?” ou “A família deveria ter comprado os lugares juntos?”"
              ]
            },
            {
              "title":"Interação",
              "paragraphs":[
                "Não depende de enquete ou caixinha. A situação discutível oferece uma conversa fácil de entrar e provoca respostas espontâneas."
              ]
            }
          ],
          "extractedRule":"A cena inicial precisa ser específica, discutível e visualmente comprovável."
        }
        $json$::jsonb
      ),
      (
        2,
        $json$
        {
          "roleLabel":"Story 2 · Recompensa, humor e autoridade",
          "title":"A cena muda de significado pela lente financeira",
          "summary":"A troca de assento vira humor financeiro sem abandonar o acontecimento.",
          "evidence":"O gráfico funciona como selo de que existe um dado por trás da piada.",
          "audienceEffect":"O público recebe a resposta do loop e uma virada inesperada para o nicho.",
          "subtext":"Raul parece pensar como investidor até em situações cotidianas.",
          "funnelFunction":"Autoridade leve. O conteúdo de nicho entra sem interromper o entretenimento.",
          "extractedRule":"A lente do especialista deve reinterpretar a cena e continuar a história."
        }
        $json$::jsonb,
        $json$
        {
          "roleLabel":"Story 2 · Recompensa, humor e autoridade",
          "title":"A virada para o nicho",
          "lead":"O POV do assento paga a curiosidade. A troca vira uma piada financeira sobre uma criança a mais colaborando com o INSS.",
          "sections":[
            {
              "title":"O pulo do gato",
              "paragraphs":[
                "O primeiro story parecia uma conversa sobre educação no avião. A segunda tela transforma a mesma cena em humor financeiro. Na superfície, ele é gentil e troca o assento. Por baixo, aparece a visão do investidor preocupado com previdência, demografia e dinheiro público.",
                "O seguidor percebe que Raul pensa como investidor até numa troca de assento. O conhecimento entra como repertório espontâneo, sem formato de aula."
              ]
            },
            {
              "title":"Por que o gráfico está ali",
              "bullets":[
                "Selo de que existe um dado por trás da piada.",
                "Reconhecimento imediato do assunto.",
                "Justificativa visual do humor.",
                "Reforço de autoridade, mesmo com números pequenos demais para estudo."
              ]
            },
            {
              "title":"Funil e interação",
              "paragraphs":[
                "A sequência entra em autoridade leve sem abandonar o entretenimento. As reações com emojis acrescentam prova social: outras pessoas entenderam e estão curtindo a conversa."
              ]
            }
          ],
          "extractedRule":"A lente do especialista precisa reinterpretar a cena e continuar a história."
        }
        $json$::jsonb
      ),
      (
        3,
        $json$
        {
          "roleLabel":"Story 3 · Prova social, posicionamento e confiança",
          "title":"O público introduz o status e Raul revela o princípio",
          "summary":"A resposta de um seguidor permite falar de patrimônio sem autopromoção direta.",
          "evidence":"A palavra “hoje” mantém aberta a possibilidade de crescimento futuro.",
          "audienceEffect":"O seguidor introduz o jatinho, evitando autopromoção direta.",
          "subtext":"A resposta comunica riqueza com racionalidade e critério.",
          "funnelFunction":"Consideração. A coerência prepara o público para aprender e comprar dele.",
          "extractedRule":"Use a reação da audiência para revelar um valor que organize suas escolhas."
        }
        $json$::jsonb,
        $json$
        {
          "roleLabel":"Story 3 · Prova social, posicionamento e confiança",
          "title":"Dinheiro, status e valores",
          "lead":"O público atribui status e Raul responde com sobriedade. A cena termina revelando um princípio de decisão financeira.",
          "sections":[
            {
              "title":"O que está sendo comunicado",
              "bullets":[
                "Ele voa toda semana.",
                "Um seguidor o associa a alguém capaz de cogitar um jatinho.",
                "Ele recusa o gasto por considerá-lo pouco útil “hoje”, não por falta de dinheiro.",
                "Transmite riqueza com racionalidade, em vez de ostentação.",
                "A resposta combina com a promessa implícita de um educador financeiro: dinheiro deve ser usado com critério."
              ]
            },
            {
              "title":"A palavra “hoje”",
              "paragraphs":[
                "Ela deixa a porta aberta para o crescimento futuro sem prometer nada. É um detalhe pequeno que impede a resposta de soar definitiva ou defensiva."
              ]
            },
            {
              "title":"Prova social indireta",
              "paragraphs":[
                "O seguidor introduz o jatinho. Isso permite que Raul fale de patrimônio e estilo de vida sem parecer que acordou querendo anunciar que é rico. O público atribui status e ele responde com sobriedade."
              ]
            },
            {
              "title":"Função no funil",
              "paragraphs":[
                "Fortalece confiança, demonstra coerência entre discurso e comportamento, cria aspiração sem extravagância e prepara o público para aprender com ele."
              ]
            },
            {
              "title":"Raciocínio silencioso provocado",
              "paragraphs":[
                "“Ele chegou num nível alto e continua tomando decisões racionais. Talvez valha a pena aprender com ele.”"
              ]
            }
          ],
          "extractedRule":"O fechamento deve revelar um princípio sem transformar status em autopropaganda."
        }
        $json$::jsonb
      )
  ) as dossier(narrative_order, quick, deep)
    on dossier.narrative_order = link.narrative_order
  where link.sequence_id = v_sequence_id
    and item.item_id = link.item_id;

  get diagnostics v_updated_items = row_count;
  if v_updated_items <> 3 then
    raise exception 'cannot add Raul Sena dossier fidelity: expected 3 stories, updated %',
      v_updated_items
      using errcode = '23514';
  end if;
end;
$$;

commit;
