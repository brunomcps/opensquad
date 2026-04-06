/**
 * insert-segment-insights.ts — Insights gerados por IA para segmentos e sub-segmentos
 * Análise baseada nos dados reais dos 9.047 comentários classificados
 */
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.SUPABASE_URL || 'https://vdaualgktroizsttbrfh.supabase.co',
  process.env.SUPABASE_KEY || ''
);

interface SegmentInsight {
  segmentId: string;
  title: string;
  narrative: string;
  stats: Record<string, any>;
}

const SEGMENT_INSIGHTS: SegmentInsight[] = [
  // === JORNADA ===
  {
    segmentId: 'confirmado_perdido',
    title: 'Sabem que têm TDAH. Não sabem o que fazer com isso.',
    narrative: `Esse é o **paradoxo central deste segmento**: 591 pessoas já passaram pela barreira mais difícil — o diagnóstico — mas pararam aí. Não estão em tratamento. Não buscaram acompanhamento. Estão num limbo entre saber e agir.

O que chama atenção é que **não existe UMA dor dominante**. As demandas se fragmentam entre comorbidades, relacionamentos destruídos, regulação emocional e autoestima. Cada pessoa está "perdida" de um jeito diferente — e talvez por isso nenhuma solução genérica pareça servir.

O sub-segmento mais pesado é o **Luto do diagnóstico tardio** (161 pessoas). Gente que descobriu aos 40, 50, 60 anos e agora olha pra trás com uma pergunta que dói: *"e se eu tivesse sabido antes?"*. Logo atrás, **Relacionamentos destruídos** (118) — casamentos que acabaram, amizades que sumiram, vínculos que o TDAH corroeu sem que a pessoa entendesse por quê.

**O que isso significa na prática:** esse segmento é o que mais precisa de um "próximo passo" claro. Eles já acreditam no diagnóstico — falta o roteiro. Um conteúdo ou produto que diga *"você descobriu que tem TDAH, agora faça ISSO"* fala diretamente com 591 pessoas que hoje estão paradas.`,
    stats: {
      feminino_pct: 66,
      sentimento_top: 'frustração, identificação, neutro',
      demanda_top: 'fragmentada (comorbidades, relacionamentos, regulação)',
    },
  },
  {
    segmentId: 'descoberta',
    title: 'O momento do "meu Deus, sou eu" — e depois, silêncio.',
    narrative: `288 pessoas vivendo o momento da epifania. **100% com sentimento de identificação** — é literalmente o filtro desse segmento. São pessoas que assistiram um vídeo, leram os sintomas e pensaram: *"isso explica toda a minha vida"*.

Mas aqui está o ponto cego: **apenas 43 delas (15%) dizem que vão buscar diagnóstico**. As outras 245 se identificam... e param. O maior sub-segmento se chama exatamente isso: *"Se identificou com os sintomas"* (119 pessoas). Não perguntam onde ir, não pedem indicação de profissional. Só dizem "sou eu" e voltam pra vida.

Isso cria um funil com **enorme vazamento no meio**. Os vídeos de sintomas atraem em massa (são os mais virais), mas a conversão pra ação é de 15%. As outras 85% ficam no limbo — provavelmente voltarão a assistir mais vídeos, se identificarão de novo, e o ciclo se repete.

**O que isso significa na prática:** todo vídeo de sintomas precisa de um **CTA de transição** — não "compre meu produto", mas *"se você se identificou, o próximo passo é X"*. Um guia gratuito de "como buscar diagnóstico" é o lead magnet natural que transforma espectadores passivos em pessoas que agem.`,
    stats: {
      feminino_pct: 72,
      sentimento_top: 'identificação (100%)',
      demanda_top: 'diagnóstico (75) — muito à frente das demais',
    },
  },
  {
    segmentId: 'busca_ativa',
    title: 'Querem pagar por ajuda. Não conseguem.',
    narrative: `Esse segmento é fundamentalmente diferente da Descoberta. Aqui, **todas as 226 pessoas estão frustradas** — não é mais identificação passiva, é urgência. Querem agir, querem diagnóstico, querem profissional. Mas esbarram em barreiras reais.

A mais dolorosa: **barreira financeira** (37 comentários). São pessoas que dizem *"quero consultar mas não tenho como pagar"*, *"SUS não oferece"*, *"é caro demais"*. Elas já querem comprar a solução — o preço é que as impede.

Enquanto isso, 56 estão **sofrendo no trabalho ou nos estudos** — o TDAH está custando emprego, faculdade, oportunidade. O gatilho de busca não é curiosidade, é desespero profissional.

**O que isso significa na prática:** esse é o segmento com a **intenção de compra mais clara** de toda a audiência. Eles já passaram da fase de "será que eu tenho?" — estão na fase "como eu resolvo?". Qualquer produto acessível (preço social, parcelamento, conteúdo gratuito sobre acesso ao SUS) converte diretamente. Parcerias com profissionais que oferecem primeira consulta a preço acessível seriam altamente valorizadas.`,
    stats: {
      feminino_pct: 68,
      sentimento_top: 'frustração (100%)',
      demanda_top: 'diagnóstico (89), produtividade (45), barreira financeira (37)',
    },
  },
  {
    segmentId: 'em_tratamento',
    title: 'Tomam remédio. Fazem terapia. Ainda sofrem.',
    narrative: `O dado mais revelador desse segmento: **frustração ainda é o sentimento #1** (25%), mesmo entre pessoas que JÁ estão em tratamento. Isso derruba a narrativa de que "bastou tratar, resolveu". Não resolveu. 386 pessoas estão medicadas, acompanhadas — e ainda frustradas.

Mas existe um contraponto poderoso: **esperança aparece em 16% dos comentários** — a maior taxa de esperança entre todos os segmentos. E o maior sub-segmento é **"Compartilhando o que funciona"** (178 comentários, quase metade). Essas pessoas já acharam caminhos e querem dividir com outras.

O segundo maior sub-segmento é **"Medicação não resolve tudo"** (126). São as que tomam Ritalina ou Venvanse e percebem que a pílula resolve atenção, mas não resolve rotina, nem regulação emocional, nem organização. **O gap está no "além da medicação".**

**O que isso significa na prática:** esse grupo já passou pelas fases de negação, diagnóstico e início do tratamento. O que eles pedem agora são **estratégias complementares** — como montar rotina, como se organizar, como regular emoções. É o público ideal para um produto de "gestão diária do TDAH" que vá além do consultório. E os 178 que compartilham o que funciona são **prova social viva** — depoimentos prontos.`,
    stats: {
      feminino_pct: 60,
      sentimento_top: 'frustração (25%), neutro (18%), esperança (16%)',
      demanda_top: 'medicação (58), diagnóstico (62), comorbidades (28)',
    },
  },
  {
    segmentId: 'superfa_engajado',
    title: '938 pessoas que voltam. E voltam. E voltam.',
    narrative: `Superfãs não são apenas "quem mais comenta" — são **quem mais processa**. O sentimento dominante é **neutro (30%)**, muito acima da média geral. Eles já passaram pelo choque, pela frustração, pela identificação. Agora consomem conteúdo como quem faz manutenção: regular, constante, quase ritualístico.

São 938 pessoas que geraram **3.376 comentários** — média de 3,6 por pessoa. O canal virou um grupo de apoio informal para eles. O maior sub-segmento é **"Relatos de sintomas cotidianos"** (607) — compartilham experiências do dia a dia como quem desabafa com amigos. Não pedem ajuda, não buscam solução. Querem ser ouvidos e validados.

O dado mais estratégico: **as demandas dos superfãs são um espelho diversificado de TODA a audiência** — diagnóstico (184), produtividade (113), regulação (90), medicação (83), relacionamentos (82). Não têm uma dor concentrada. Têm TODAS as dores, em volume.

**O que isso significa na prática:** superfãs são os **primeiros compradores** de qualquer produto — já confiam, já acompanham, já se identificam. Mas mais que isso, são os **evangelizadores**. Lives, membros, respostas personalizadas a comentários — tudo que cria senso de comunidade fortalece esse exército. Eles vendem por você quando recomendam o canal para amigos e familiares.`,
    stats: {
      feminino_pct: 76,
      total_comments: 3376,
      sentimento_top: 'neutro (30%), frustração (20%), identificação (19%)',
      demanda_top: 'diversificada — espelho de toda a audiência',
    },
  },

  // === PAPEL ===
  {
    segmentId: 'familiar',
    title: 'Não têm TDAH. Mas sofrem com ele todos os dias.',
    narrative: `160 pessoas que assistem o canal **não por si mesmas, mas por alguém que amam**. 81% são mulheres — mães, esposas, irmãs. A demanda é quase unânime: **psicoeducação** (156 de 160 menções). Querem entender o TDAH do outro. Querem saber como ajudar sem enlouquecer.

A frustração domina (35%) — mas é uma frustração diferente. Não é *"eu tenho TDAH e sofro"*. É *"eu convivo com alguém que tem TDAH e não sei mais o que fazer"*. O sub-segmento **"Filho(a) diagnosticado(a)"** (56) é o maior — pais descobrindo TDAH no filho e sem manual de instruções.

O insight mais importante: **esse grupo é quase invisível no conteúdo atual**. A maioria dos vídeos fala COM a pessoa que tem TDAH. Quase nenhum fala com quem convive com ela. São 160 pessoas pedindo um conteúdo que basicamente não existe no canal.

**O que isso significa na prática:** um vídeo "Para quem CONVIVE com alguém com TDAH" atenderia uma demanda não-competitiva — quase nenhum criador no nicho faz isso. Um guia de psicoeducação para familiares seria um produto com demanda clara e zero concorrência direta.`,
    stats: {
      feminino_pct: 81,
      sentimento_top: 'frustração (35%), neutro (20%), tristeza (13%)',
      demanda_top: 'psicoeducação (156 de 160)',
    },
  },
  {
    segmentId: 'mae_filhos',
    title: '"Descobri meu TDAH por causa do meu filho."',
    narrative: `Essa frase aparece dezenas de vezes nos comentários e revela o padrão central deste segmento: **mães que só descobriram o próprio TDAH quando o filho foi diagnosticado**. O espelho do diagnóstico do filho revelou o que elas carregavam há décadas sem nome.

São 234 mulheres carregando um **duplo fardo**: lidar com o próprio TDAH não-tratado (muitas descobriram tarde) E criar filhos neurodivergentes num mundo que não entende nenhum dos dois. A frustração lidera (31%), mas gratidão aparece em 16% — agradecem por finalmente entenderem.

O maior sub-segmento é **"Reconhecendo TDAH no filho"** (143) — mais da metade do grupo. Logo atrás, **"Estratégias e apoio"** (78) e **"Descoberta tardia como mãe"** (77) revelam as duas faces: buscar ajuda pro filho e processar o próprio diagnóstico tardio.

**O que isso significa na prática:** a narrativa "mãe que se descobre TDAH pelo filho" é **extremamente poderosa para conteúdo** — gera identificação instantânea e é emocionalmente carregada. Conteúdo sobre parentalidade neurodivergente (mãe TDAH criando filho TDAH) atende uma dor específica que nenhum canal grande cobre bem.`,
    stats: {
      feminino_pct: 100,
      sentimento_top: 'frustração (31%), identificação (19%), gratidão (16%)',
      demanda_top: 'psicoeducação (62), diagnóstico (34), maternidade (23)',
    },
  },
  {
    segmentId: 'casado',
    title: 'O parceiro não é o problema. É a tábua de salvação.',
    narrative: `O dado mais surpreendente deste segmento: **a proporção entre "cônjuge como suporte" (132) e "casamento destruído" (13) é de 10 pra 1**. A narrativa dominante NÃO é "TDAH destruiu meu casamento" — é "meu parceiro me segura quando eu desmorono".

É também o segmento com **maior proporção masculina** entre os de papel/relação: 33% homens (vs 19% na média geral). Homens casados parecem mais dispostos a falar sobre TDAH quando o contexto é o relacionamento — talvez porque a esposa seja o gatilho de busca.

A frustração domina (30%), mas é contextual — não é frustração com o parceiro, é frustração com o TDAH no contexto do casamento. *"Eu quero ser melhor pro meu parceiro, mas meu cérebro não colabora"* é o tom predominante.

**O que isso significa na prática:** o conteúdo mais valioso aqui não é "como salvar o casamento" (dramático demais pra esse público). É **"como o cônjuge pode ser aliado"** — prático, acolhedor, sem culpa. Vídeos direcionados ao parceiro SEM TDAH ("como apoiar seu marido/esposa com TDAH sem se anular") atendem uma demanda que quase ninguém está cobrindo.`,
    stats: {
      feminino_pct: 67,
      masculino_pct: 33,
      sentimento_top: 'frustração (30%), identificação (20%), neutro (18%)',
      demanda_top: 'relacionamentos (51)',
      insight_surpresa: 'suporte:crise = 10:1',
    },
  },
];

async function main() {
  console.log('Inserindo insights de segmentos...\n');

  // Delete existing segment insights
  await sb.from('aud_insights').delete().eq('level', 3);

  for (const insight of SEGMENT_INSIGHTS) {
    const { error } = await sb.from('aud_insights').insert({
      level: 3,
      dimension: insight.segmentId,
      title: insight.title,
      narrative: insight.narrative,
      data_snapshot: insight.stats,
      generated_at: new Date().toISOString(),
    });

    if (error) {
      console.log(`  ERROR ${insight.segmentId}: ${error.message}`);
    } else {
      console.log(`  ✓ ${insight.segmentId}: ${insight.title}`);
    }
  }

  const { count } = await sb.from('aud_insights').select('*', { count: 'exact', head: true });
  console.log(`\nTotal insights: ${count}`);
}

main().catch(console.error);
