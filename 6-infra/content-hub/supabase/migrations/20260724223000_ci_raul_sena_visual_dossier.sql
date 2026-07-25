begin;

-- Enrich only the dedicated Raul Sena dossier. The independent
-- "História → pequena entrega → CTA" template and its reference are outside
-- every selector and mutation in this migration.
do $$
declare
  v_template_id uuid;
  v_sequence_id uuid;
  v_updated_items integer;
begin
  select template_id into v_template_id
  from public.story_templates
  where lower(btrim(name)) = lower('Cena → lente → princípio')
    and status <> 'archived'
  order by created_at, template_id
  limit 1
  for update;

  if v_template_id is null then
    raise exception 'cannot enrich Raul Sena dossier: template Cena → lente → princípio is missing'
      using errcode = '23503';
  end if;

  select sequence_id into v_sequence_id
  from public.story_sequences
  where kind = 'reference'
    and source_url = 'https://www.instagram.com/_raulsena/'
  order by created_at, sequence_id
  limit 1
  for update;

  if v_sequence_id is null then
    raise exception 'cannot enrich Raul Sena dossier: canonical reference is missing'
      using errcode = '23503';
  end if;

  if not exists (
    select 1
    from public.template_sequence_links
    where template_id = v_template_id
      and sequence_id = v_sequence_id
      and is_primary
  ) then
    raise exception 'cannot enrich Raul Sena dossier: canonical template link is missing'
      using errcode = '23503';
  end if;

  update public.story_templates
  set description = 'Parte de uma cena cotidiana, muda seu significado pela lente do especialista e termina revelando um princípio pessoal.',
      objective = 'Transformar rotina em posicionamento sem abrir com uma aula.',
      definition = $json$
      {
        "formula":"Cena real → lente do especialista → reação do público → princípio pessoal",
        "risks":[
          "Virar uma aula e interromper a história antes de pagar o gancho",
          "Usar status ou prova visual como autopromoção direta"
        ],
        "preserveRules":[
          "Função de cada tela, continuidade espacial, troca de estímulo e hierarquia entre cena, prova e texto."
        ],
        "adaptRules":[
          "Cenário, roupa, paleta, fonte, tipo de dado e forma de interação para a linguagem do Bruno."
        ],
        "avoidRules":[
          "Copiar avião, piada financeira ou caixa preta apenas porque aparecem na referência."
        ],
        "moldSteps":[
          {
            "title":"Cena e gancho",
            "purpose":"Abrir uma situação banal, específica e visualmente comprovável que pare antes da decisão.",
            "fixedFunction":"Comprovar a cena e abrir uma pergunta.",
            "placeholders":[
              {"kind":"copy","label":"Gancho específico que para antes da decisão"},
              {"kind":"scene","label":"Cena real reconhecível"},
              {"kind":"person","label":"Rosto ou pessoa; gesto aponta para a prova"},
              {"kind":"reaction","label":"Resposta espontânea, se houver"}
            ]
          },
          {
            "title":"Lente do especialista",
            "purpose":"Reinterpretar a mesma cena com humor, dado ou repertório de nicho.",
            "fixedFunction":"Reinterpretar a cena sem interromper a história.",
            "placeholders":[
              {"kind":"copy","label":"Payoff + interpretação de nicho"},
              {"kind":"scene","label":"Segundo ângulo do mesmo ambiente"},
              {"kind":"proof","label":"Dado, gráfico, artigo ou outra prova visual"},
              {"kind":"reaction","label":"Reações do público"}
            ]
          },
          {
            "title":"Resposta e princípio",
            "purpose":"Usar a reação do público para revelar como o criador pensa e toma decisões.",
            "fixedFunction":"Usar o público para revelar como o criador pensa.",
            "placeholders":[
              {"kind":"scene","label":"Continuidade do ambiente"},
              {"kind":"response","label":"Print de comentário ou mensagem"},
              {"kind":"principle","label":"Resposta que revela um princípio"},
              {"kind":"reaction","label":"Reações ou próxima conversa"}
            ]
          }
        ],
        "steps":[
          {"role":"hook","instruction":"Mostrar uma cena real, específica e reconhecível que já abra uma pergunta."},
          {"role":"development","instruction":"Aplicar humor, dado ou interpretação que somente aquele especialista faria."},
          {"role":"closing","instruction":"Usar a resposta do público para revelar um princípio pessoal ou editorial."}
        ]
      }
      $json$::jsonb,
      tags = array['cena real', 'lente do especialista', 'posicionamento', 'story']::text[],
      schema_version = greatest(schema_version, 2),
      updated_at = now()
  where template_id = v_template_id;

  update public.story_sequences
  set title = 'Raul Sena, cena → humor → princípio',
      description = 'A estrutura combina cena cotidiana, piada ligada ao nicho, resposta do público e declaração de valores. Raul começa como uma pessoa comum viajando, encaixa finanças e previdência sem dar aula e usa a reação de um seguidor para reforçar quem ele é e como pensa sobre dinheiro.',
      analysis = $json$
      {
        "summary":"O assunto aparente é uma troca de assento. O produto real é a forma como Raul pensa sobre dinheiro.",
        "overview":[
          "A estrutura combina cena cotidiana, piada ligada ao nicho, resposta do público e declaração de valores. Raul começa como uma pessoa comum viajando, encaixa finanças e previdência sem dar aula e usa a reação de um seguidor para reforçar quem ele é e como pensa sobre dinheiro.",
          "Não há venda direta. A sequência vende uma persona bem-sucedida, acessível, espirituosa e financeiramente racional. A autoridade aparece dentro da maneira como ele interpreta a situação."
        ],
        "narrativeArc":[
          "Identificação e curiosidade",
          "Humor e autoridade",
          "Prova social, posicionamento e confiança"
        ],
        "whyItWorks":[
          "Cada tela contém uma evidência concreta e paga a promessa da anterior.",
          "A emoção progride de curiosidade para humor e termina em admiração.",
          "A autoridade aparece pela interpretação da cena, não por uma aula declarada.",
          "O público atribui status antes de Raul responder com sobriedade."
        ],
        "templateFit":"Cena cotidiana → piada de nicho → resposta do público → declaração de valores.",
        "sequenceMap":[
          {"label":"1 · Gancho","value":"Identificação + curiosidade"},
          {"label":"2 · Recompensa","value":"Humor + autoridade"},
          {"label":"3 · Fechamento","value":"Prova social + confiança"},
          {"label":"Produto real","value":"Persona financeiramente racional"}
        ],
        "visualGrammar":"Fundo sempre capturado no mesmo ambiente. A cada tela muda o elemento dominante: rosto → gráfico → print. O texto mantém assinatura consistente, branco serifado em caixa preta. A produção parece nativa, barata e espontânea, mas a hierarquia é controlada.",
        "productRevealed":"O assunto aparente é troca de assento. O produto real é um Raul bem-sucedido, acessível, espirituoso, financeiramente racional e conectado com o público.",
        "transferRules":[
          "Começar pela vida real, sem anunciar uma aula.",
          "Interpretar a cena pela psicologia e neurociência.",
          "Usar respostas do público como continuação da história.",
          "Deixar a autoridade aparecer pela leitura da situação.",
          "Transformar interação em matéria-prima do próximo story.",
          "Comunicar valores clínicos e pessoais sem autopropaganda.",
          "Usar um registro cotidiano como impulso para o conteúdo.",
          "Preservar o sintoma em terceira pessoa ao falar de TDAH."
        ]
      }
      $json$::jsonb,
      updated_at = now()
  where sequence_id = v_sequence_id;

  update public.story_items item
  set text_content = dossier.text_content,
      metadata = dossier.metadata
  from public.sequence_item_links link
  join (
    values
      (
        1,
        'Abre com uma cena cotidiana e reconhecível: a família quer trocar de assento. O conflito é pequeno, concreto e segura a curiosidade.',
        $json$
        {
          "evidenceType":"reference_story",
          "sourceExcerpt":"“Eu quase sempre viajo sozinho, e uma vez a cada aproximadamente 10 voos aparece uma família querendo trocar de assento.”",
          "analysis":"O número “uma vez a cada 10 voos” dá aparência de observação real.",
          "audienceEffect":"A frase para antes da decisão e produz: “ele troca ou se recusa?”",
          "subtext":"A viagem comunica status, mas o assunto permanece cotidiano e acessível.",
          "funnelFunction":"Relacionamento. A situação discutível convida respostas espontâneas.",
          "extractedRule":"Comece por uma cena banal, específica e visualmente comprovável que já abra uma pergunta.",
          "editorialStatus":"approved",
          "moldConsequence":"A cena inicial precisa ser específica, discutível e visualmente comprovável.",
          "analysisSections":[
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
          "visual":{
            "roleLabel":"Story 1 · Rosto e contexto",
            "title":"Cena cotidiana com prova visual",
            "scene":"Selfie dentro do avião. Raul ocupa a metade inferior, usa camiseta preta e fones brancos. Expressão neutra e dedo apontando para trás. Uma família aparece ao fundo.",
            "typography":"Texto branco, serifado, centralizado, sobre uma caixa preta retangular. O bloco ocupa o terço superior e preserva rosto e contexto.",
            "composition":"Texto no alto, rosto como massa principal, gesto criando uma diagonal e resposta de seguidor na base.",
            "palette":["#111315","#e9e5da","#6e7275","#1c2d45","#d8b29a"],
            "impression":"Proximidade, espontaneidade e uma situação real acontecendo agora.",
            "markers":[
              {"label":"1","description":"O dedo orienta o olhar para o fundo."},
              {"label":"2","description":"A família funciona como prova visual da história."}
            ]
          }
        }
        $json$::jsonb
      ),
      (
        2,
        'Paga a curiosidade com humor de nicho. A troca de assento vira uma piada financeira sobre uma criança a mais colaborando com o INSS.',
        $json$
        {
          "evidenceType":"reference_story",
          "sourceExcerpt":"“Eu troco e fico feliz da vida… É uma criança a mais para colaborar com o INSS.”",
          "analysis":"O gráfico funciona como selo de que existe um dado por trás da piada.",
          "audienceEffect":"O público recebe a resposta do loop e uma virada inesperada para o nicho.",
          "subtext":"Raul parece pensar como investidor até em situações cotidianas.",
          "funnelFunction":"Autoridade leve. O conteúdo de nicho entra sem interromper o entretenimento.",
          "extractedRule":"A lente do especialista deve reinterpretar a cena e continuar a história.",
          "editorialStatus":"approved",
          "moldConsequence":"A virada de nicho precisa pagar o gancho sem abandonar o acontecimento.",
          "analysisSections":[
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
          "visual":{
            "roleLabel":"Story 2 · POV e dado",
            "title":"Virada de nicho com prova gráfica",
            "scene":"Nenhum rosto. Câmera apontada para assento, pernas e estrutura do avião. O enquadramento mantém o mesmo ambiente e parece capturado sem preparação.",
            "typography":"Duas caixas pretas separadas, com texto branco serifado e centralizado. A primeira entrega a decisão e a segunda contém a piada sobre o INSS.",
            "composition":"O POV renova o estímulo visual sem quebrar a continuidade espacial.",
            "graphic":"Gráfico branco grande no centro, com barras vermelhas descendentes. Os números são pequenos, mas o padrão visual comunica déficit crescente.",
            "palette":["#1d1d1b","#8c8579","#f7f7f2","#df2327","#5e191c"],
            "impression":"Humor casual sustentado por uma camada de dado e autoridade.",
            "markers":[
              {"label":"1","description":"O POV renova o estímulo visual."},
              {"label":"2","description":"O gráfico reforça contexto e autoridade."}
            ]
          }
        }
        $json$::jsonb
      ),
      (
        3,
        'Fecha com uma lente de mundo: mesmo voando toda semana, ele prefere usar o dinheiro de outras formas. A cena termina em princípio e posicionamento.',
        $json$
        {
          "evidenceType":"reference_story",
          "sourceExcerpt":"“Mesmo voando toda semana, eu não acho que um jato seria necessário hoje. Vejo formas mais úteis de gastar esse dinheiro.”",
          "analysis":"A palavra “hoje” mantém aberta a possibilidade de crescimento futuro.",
          "audienceEffect":"O seguidor introduz o jatinho, evitando autopromoção direta.",
          "subtext":"A resposta comunica riqueza com racionalidade e critério.",
          "funnelFunction":"Consideração. A coerência prepara o público para aprender e comprar dele.",
          "extractedRule":"Use a reação da audiência para revelar um valor que organize suas escolhas.",
          "editorialStatus":"approved",
          "moldConsequence":"O fechamento deve revelar um princípio sem transformar status em autopropaganda.",
          "analysisSections":[
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
          "visual":{
            "roleLabel":"Story 3 · Resposta e princípio",
            "title":"Status atribuído pelo público",
            "scene":"Sem rosto. Piso, estrutura do assento, perna com roupa escura e detalhe vermelho do calçado. O avião continua reconhecível.",
            "typography":"Duas caixas pretas no terço inferior, com texto branco serifado. A palavra “hoje” fecha o primeiro bloco e recebe destaque pelo próprio sentido.",
            "composition":"Print branco de uma resposta ocupa o centro superior. A declaração de princípio aparece logo abaixo. Reações ficam próximas da base.",
            "palette":["#171817","#45433d","#f7f6f2","#8f1821","#d8d6cf"],
            "impression":"Sobriedade, continuidade e uma conversa íntima que revela valores.",
            "markers":[
              {"label":"1","description":"O print terceiriza a atribuição de status."},
              {"label":"2","description":"“Hoje” evita uma rejeição definitiva."}
            ]
          }
        }
        $json$::jsonb
      )
  ) as dossier(narrative_order, text_content, metadata)
    on dossier.narrative_order = link.narrative_order
  where link.sequence_id = v_sequence_id
    and item.item_id = link.item_id;

  get diagnostics v_updated_items = row_count;
  if v_updated_items <> 3 then
    raise exception 'cannot enrich Raul Sena dossier: expected 3 stories, updated %', v_updated_items
      using errcode = '23514';
  end if;
end;
$$;

commit;
