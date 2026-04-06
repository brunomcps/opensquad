/**
 * subcategorize-prova-social.ts — Cria subcategorias dentro das 3 categorias grandes:
 * - Transformacao: alivio emocional (134)
 * - Transformacao: tomou uma acao (115)
 * - Elogios gerais (921)
 *
 * Salva em aud_subclusters com parent_value = ID da categoria pai
 */
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.SUPABASE_URL || 'https://vdaualgktroizsttbrfh.supabase.co',
  process.env.SUPABASE_KEY || ''
);

interface SubcatDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
  keywords: string[];
  parentCategory: string; // cluster_name of the parent
}

const SUBCATS: SubcatDef[] = [
  // ============================================================
  // ALIVIO EMOCIONAL subcategories
  // ============================================================
  {
    id: 'emocional_me_descreveu',
    name: 'Me descreveu inteiro',
    emoji: '🪞',
    description: 'Sentiu que o vídeo descreveu sua vida perfeitamente, como se o Dr. Bruno o conhecesse.',
    keywords: [
      'me descreveu', 'descreveu inteiro', 'descreveu perfeitamente',
      'me definiu', 'minha biografia', 'resumo sobre eu',
      'parece que me conhece', 'me conhecia', 'leu perfeitamente',
      'abriu meu cerebro', 'retrato fiel', 'encaixei em tudo',
      'descricao perfeita', 'contou minha historia', 'resumiu minha vida',
      'tava me vigiando', 'ta me seguindo',
    ],
    parentCategory: 'Transformacao: alivio emocional',
  },
  {
    id: 'emocional_diagnostico_tardio',
    name: 'Diagnostico tardio — luto e alivio',
    emoji: '⏳',
    description: 'Descobriu TDAH depois dos 40-50+ anos, mistura de luto pelo tempo perdido e alívio por finalmente entender.',
    keywords: [
      'aos 40', 'aos 41', 'aos 42', 'aos 43', 'aos 44', 'aos 45',
      'aos 46', 'aos 47', 'aos 48', 'aos 49', 'aos 50', 'aos 51',
      'aos 52', 'aos 53', 'aos 54', 'aos 55', 'aos 56', 'aos 57',
      'aos 58', 'aos 59', 'aos 60', 'aos 61', 'aos 62', 'aos 63',
      'aos 64', 'aos 65', 'aos 66', 'aos 67', 'aos 68', 'aos 69',
      'aos 70', 'aos 71', 'aos 72', 'aos 73', 'aos 74', 'aos 75',
      'aos 76', 'aos 77', 'aos 78',
      '40 anos', '50 anos', '60 anos', '70 anos',
      'diagnostico tardio', 'luto e alivio', 'luto e alívio',
      'so agora', 'só agora', 'finalmente descobri', 'vida inteira',
      'anos de idade',
    ],
    parentCategory: 'Transformacao: alivio emocional',
  },
  {
    id: 'emocional_libertacao_culpa',
    name: 'Libertacao da culpa',
    emoji: '🔓',
    description: 'Alívio ao entender que não é defeito, preguiça, loucura ou burrice — é TDAH.',
    keywords: [
      'nao e defeito', 'não é defeito', 'nao e preguica', 'não é preguiça',
      'nao e doida', 'não é doida', 'nao e doido', 'não é doido',
      'nao e burra', 'não é burra', 'nao e loucura', 'não é loucura',
      'nao e frieza', 'não é frieza', 'nao e falta de vontade',
      'libertador', 'libertou', 'libertacao', 'libertação',
      'tirou um peso', 'peso das costas', 'tirei uma venda',
      'tirou uma venda', 'nao sou doida', 'não sou doida',
      'nao sou maluco', 'não sou maluco', 'nao sou inutil', 'não sou inútil',
      'nao e culpa minha', 'não é culpa minha',
      'jeito do cerebro', 'jeito do meu cerebro',
    ],
    parentCategory: 'Transformacao: alivio emocional',
  },
  {
    id: 'emocional_acolhimento',
    name: 'Se sentiu acolhida e compreendida',
    emoji: '🤗',
    description: 'Sentiu-se compreendida, acolhida, não julgada — muitas vezes pela primeira vez.',
    keywords: [
      'compreendida', 'compreendido', 'acolhida', 'acolhido',
      'nao julgue', 'não julgue', 'sem julgamento', 'nao julga',
      'me entende', 'me entendeu', 'se sentir entendid',
      'primeira vez', 'pela primeira vez', 'nunca ninguem',
      'nunca ninguém', 'primeira explicacao', 'primeira explicação',
    ],
    parentCategory: 'Transformacao: alivio emocional',
  },
  {
    id: 'emocional_chorou',
    name: 'Chorou ou emocionou',
    emoji: '😢',
    description: 'A pessoa chorou ou se emocionou profundamente ao assistir o conteúdo.',
    keywords: [
      'chorei', 'chorou', 'chorando', 'lagrima', 'lágrima',
      'lacrimej', 'em lagrimas', 'em lágrimas',
      'vontade de chorar', 'emocionei', 'emociono',
      'emocionada', 'emocionado',
    ],
    parentCategory: 'Transformacao: alivio emocional',
  },

  // ============================================================
  // TOMOU UMA ACAO subcategories
  // ============================================================
  {
    id: 'acao_buscou_tratamento',
    name: 'Buscou ou comecou tratamento',
    emoji: '🏥',
    description: 'Motivou-se a buscar diagnóstico, marcar consulta ou iniciar tratamento.',
    keywords: [
      'comecou tratamento', 'começou tratamento', 'iniciei tratamento',
      'inicio de tratamento', 'início de tratamento',
      'marquei consulta', 'marcar consulta', 'agendei', 'agendou',
      'buscar ajuda', 'buscou ajuda', 'procurei ajuda', 'procurou ajuda',
      'vou procurar ajuda', 'vou buscar', 'vou marcar', 'vou agendar',
      'fui diagnosticad', 'foi diagnosticad', 'buscar diagnostico',
      'buscar diagnóstico', 'partiu procurar',
      'vou buscar um profissional', 'procurar profissional',
      'iniciando com medicamento', 'começar o tratamento',
    ],
    parentCategory: 'Transformacao: tomou uma acao',
  },
  {
    id: 'acao_aplicou_estrategias',
    name: 'Aplicou estrategias do video',
    emoji: '⚡',
    description: 'Implementou dicas ou estratégias específicas mencionadas no vídeo e viu resultado.',
    keywords: [
      'coloco em pratica', 'colocar em pratica', 'colocando em pratica',
      'vou colocar em pratica', 'vou aplicar', 'aplicar',
      'comecou a seguir', 'comecei a seguir',
      'estrategias do video', 'dicas do video',
      'dicas praticas', 'dicas valiosas',
      'funciona', 'funcionou', 'deu certo', 'ta funcionando',
      'tá funcionando', 'está funcionando',
      'mudou minha vida', 'mudou meu dia',
      'implementar', 'implementou', 'protocolo',
      'comecou a jogar', 'começou a jogar', 'jogar coisas fora',
      'acordar cedo', 'levantar cedo', 'rotina matinal',
      'luz especial', 'abriu cortinas',
    ],
    parentCategory: 'Transformacao: tomou uma acao',
  },
  {
    id: 'acao_resultado_concreto',
    name: 'Resultado concreto alcancado',
    emoji: '🏆',
    description: 'Relata melhora mensurável: vida melhorou, controla sintomas, está feliz com resultado.',
    keywords: [
      'vida melhorou', 'vida melhor', 'estou melhor', 'me sinto melhor',
      'feliz com o resultado', 'estou feliz', 'deu resultado',
      'melhorou significativamente', 'virou outra pessoa',
      'controla agitacao', 'menos erros', 'mais foco',
      'mais calma', 'mais confiante', 'mais produtiv',
      'salvou meu casamento', 'salvou meu relacionamento',
      'divisor de agua', 'divisor de águas',
    ],
    parentCategory: 'Transformacao: tomou uma acao',
  },
  {
    id: 'acao_inscreveu',
    name: 'Inscreveu ou maratonou',
    emoji: '🔔',
    description: 'Se inscreveu no canal, está maratonando os vídeos, engajou ativamente.',
    keywords: [
      'me inscrevi', 'inscrev', 'ganhou inscrit',
      'maratonando', 'maratona', 'assistindo todos',
      'vou assistir varias vezes', 'vou assistir várias',
      'mais um inscrito', 'seguindo',
    ],
    parentCategory: 'Transformacao: tomou uma acao',
  },

  // ============================================================
  // ELOGIOS GERAIS subcategories
  // ============================================================
  {
    id: 'generico_didatica',
    name: 'Elogio a didatica e clareza',
    emoji: '🎓',
    description: 'Elogia a forma de explicar: didática, clareza, linguagem acessível, fácil compreensão.',
    keywords: [
      'didatica', 'didática', 'didatico', 'didático',
      'forma tao clara', 'forma tão clara', 'clareza',
      'facil compreensao', 'fácil compreensão',
      'explicacao clara', 'explicação clara', 'explicacoes claras',
      'facil de entender', 'fácil de entender',
      'linguagem acessivel', 'linguagem acessível',
      'forma de explicar', 'maneira de explicar',
      'ao alcance', 'objetiv',
      'sem enrolacao', 'sem enrolação',
      'forma simples', 'de forma simples',
      'precisao', 'precisão', 'preciso',
    ],
    parentCategory: 'Elogios gerais',
  },
  {
    id: 'generico_melhor_canal',
    name: 'Melhor canal ou melhor video',
    emoji: '🥇',
    description: 'Declara que é o melhor canal, melhor vídeo, melhor conteúdo sobre TDAH.',
    keywords: [
      'melhor canal', 'melhor video', 'melhor vídeo',
      'melhor conteudo', 'melhor conteúdo',
      'melhor explicacao', 'melhor explicação',
      'melhor aula', 'canal incrivel', 'canal incrível',
      'canal abencoad', 'canal abençoad',
      'canal necessario', 'canal necessário',
      'utilidade publica', 'utilidade pública',
      'sensacional', 'extraordinari',
    ],
    parentCategory: 'Elogios gerais',
  },
  {
    id: 'generico_identificacao',
    name: 'Se identificou (sem impacto especifico)',
    emoji: '🔍',
    description: 'Disse que se identificou, que é igualzinho, mas sem relatar impacto concreto.',
    keywords: [
      'me identifiquei', 'identifiquei muito', 'identifiquei com tudo',
      'identifiquei com todos',
      'sou eu', 'e eu', 'sou essa pessoa',
      'sou assim', 'igualzinho', 'igualzinha',
      'bola de cristal', 'parece que me vigiando',
      'leu minha mente', 'todos os sinais',
      'todos os sintomas', 'encaixei',
      'bateu tudo', 'bate tudo', 'cada item',
    ],
    parentCategory: 'Elogios gerais',
  },
  {
    id: 'generico_gratidao',
    name: 'Gratidao e agradecimento',
    emoji: '🙏',
    description: 'Agradecimento genérico: obrigado, gratidão, Deus te abençoe.',
    keywords: [
      'gratidao', 'gratidão', 'muito obrigad', 'obrigada',
      'deus te abencoe', 'deus te abençoe', 'deus abencoe', 'deus abençoe',
      'agradeco', 'agradeço', 'agradecimento',
      'parabens', 'parabéns',
    ],
    parentCategory: 'Elogios gerais',
  },
  {
    id: 'generico_humor',
    name: 'Humor e identificacao comica',
    emoji: '😂',
    description: 'Reação humorística: "vai se lascar doutor", "tá me seguindo?", piadas sobre TDAH.',
    keywords: [
      'kkkk', 'hahaha', 'kkk', 'rsrs',
      'vai se lascar', 'se lascar',
      'ta me seguindo', 'tá me seguindo',
      'me vigiando', 'mora aqui em casa',
      'vive aqui em casa', 'camera escondida',
      'câmera escondida', 'engracad', 'engraçad',
      'senso de humor',
    ],
    parentCategory: 'Elogios gerais',
  },
  {
    id: 'generico_citacao',
    name: 'Citou trecho do video',
    emoji: '💬',
    description: 'Reproduziu uma frase ou trecho específico do vídeo que marcou.',
    keywords: [
      'minuto ', '00:', '1:', '2:', '3:', '4:', '5:', '6:', '7:', '8:', '9:',
      '10:', '11:', '12:', '13:', '14:', '15:', '16:', '17:', '18:', '19:', '20:',
    ],
    parentCategory: 'Elogios gerais',
  },
  {
    id: 'generico_ajudou',
    name: 'Me ajudou (sem detalhe)',
    emoji: '💛',
    description: 'Diz que ajudou ou que o conteúdo é bom, sem especificar como.',
    keywords: [
      'me ajudou', 'ajudou muito', 'ajudou bastante',
      'tem me ajudado', 'estao me ajudando', 'estão me ajudando',
      'seus videos ajudam', 'seus vídeos ajudam',
      'me fez entender', 'fez entender', 'esclarecedor',
      'informativo', 'importante pra mim',
      'video necessario', 'vídeo necessário',
    ],
    parentCategory: 'Elogios gerais',
  },
];

async function main() {
  console.log('Subcategorizando prova social...\n');

  // Load all parent categories
  const { data: parents } = await sb.from('aud_subclusters')
    .select('id, cluster_name, comment_ids, count')
    .eq('dimension', 'prova_social')
    .eq('parent_value', 'impacto');

  if (!parents) { console.error('No parent categories found'); return; }

  // Group subcats by parent
  const parentMap: Record<string, typeof parents[0]> = {};
  for (const p of parents) parentMap[p.cluster_name] = p;

  // For each parent that has subcats, categorize its comments
  const parentsWithSubcats = ['Transformacao: alivio emocional', 'Transformacao: tomou uma acao', 'Elogios gerais'];

  for (const parentName of parentsWithSubcats) {
    const parent = parentMap[parentName];
    if (!parent) { console.log(`Parent "${parentName}" not found, skipping`); continue; }

    const ids = parent.comment_ids as string[];
    console.log(`\n=== ${parentName} (${ids.length} comments) ===`);

    // Fetch all comments for this parent
    const allComments: any[] = [];
    for (let i = 0; i < ids.length; i += 250) {
      const chunk = ids.slice(i, i + 250);
      const { data } = await sb.from('aud_comments')
        .select('id, text, impacto_descrito, peso_social, like_count, author_name, video_title')
        .in('id', chunk);
      if (data) allComments.push(...data);
    }

    // Get subcats for this parent
    const subcats = SUBCATS.filter(s => s.parentCategory === parentName);
    const subcatResults: Record<string, string[]> = {};
    for (const sc of subcats) subcatResults[sc.id] = [];
    const uncategorized: string[] = [];

    for (const c of allComments) {
      const combined = ((c.impacto_descrito || '') + ' ' + (c.text || '')).toLowerCase();
      let matched = false;

      for (const sc of subcats) {
        if (sc.keywords.some(kw => combined.includes(kw.toLowerCase()))) {
          subcatResults[sc.id].push(c.id);
          matched = true;
        }
      }

      if (!matched) uncategorized.push(c.id);
    }

    // Print stats
    for (const sc of subcats) {
      console.log(`  ${sc.emoji} ${subcatResults[sc.id].length.toString().padStart(4)} ${sc.name}`);
    }
    console.log(`  📌 ${uncategorized.length.toString().padStart(4)} Outros`);

    // Delete old subcats for this parent
    await sb.from('aud_subclusters').delete()
      .eq('dimension', 'prova_social')
      .eq('parent_value', parentName);

    // Insert new subcats
    for (const sc of subcats) {
      if (subcatResults[sc.id].length === 0) continue;

      // Get best quotes
      const sampleIds = subcatResults[sc.id].slice(0, 100);
      const { data: samples } = await sb.from('aud_comments')
        .select('text, impacto_descrito, peso_social')
        .in('id', sampleIds)
        .order('peso_social', { ascending: false });

      const quotes = (samples || []).slice(0, 3).map(s =>
        (s.impacto_descrito || (s.text || '').slice(0, 200))
      );

      await sb.from('aud_subclusters').insert({
        dimension: 'prova_social',
        parent_value: parentName,
        cluster_name: sc.name,
        cluster_description: sc.description,
        comment_ids: subcatResults[sc.id],
        example_quotes: quotes,
        count: subcatResults[sc.id].length,
      });
    }

    // Insert "Outros" if any
    if (uncategorized.length > 0) {
      const sampleIds = uncategorized.slice(0, 100);
      const { data: samples } = await sb.from('aud_comments')
        .select('text, peso_social')
        .in('id', sampleIds)
        .order('peso_social', { ascending: false });

      const quotes = (samples || []).slice(0, 3).map(s => (s.text || '').slice(0, 200));

      await sb.from('aud_subclusters').insert({
        dimension: 'prova_social',
        parent_value: parentName,
        cluster_name: 'Outros',
        cluster_description: `Elogios de "${parentName}" sem subcategoria específica.`,
        comment_ids: uncategorized,
        example_quotes: quotes,
        count: uncategorized.length,
      });
    }
  }

  // Verify
  const { data: allSc } = await sb.from('aud_subclusters')
    .select('parent_value, cluster_name, count')
    .eq('dimension', 'prova_social')
    .order('parent_value').order('count', { ascending: false });

  console.log('\n=== TODOS OS SUBCLUSTERS PROVA SOCIAL ===');
  let currentParent = '';
  for (const sc of (allSc || [])) {
    if (sc.parent_value !== currentParent) {
      currentParent = sc.parent_value;
      console.log(`\n  [${currentParent}]`);
    }
    console.log(`    ${sc.count.toString().padStart(4)} ${sc.cluster_name}`);
  }

  console.log('\nDone.');
}

main().catch(console.error);
