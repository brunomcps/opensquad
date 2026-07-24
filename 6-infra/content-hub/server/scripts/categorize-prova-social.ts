/**
 * categorize-prova-social.ts — Categoriza elogios por tipo de impacto
 * e calcula score de poder do depoimento
 */
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.SUPABASE_URL || 'https://vdaualgktroizsttbrfh.supabase.co',
  process.env.SUPABASE_KEY || ''
);

interface CategoryDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
  keywords: string[]; // matched on impacto_descrito + text
}

const CATEGORIES: CategoryDef[] = [
  {
    id: 'transformacao_comportamental',
    name: 'Transformacao: tomou uma acao',
    emoji: '\u{1F3AF}',
    description: 'Pessoa tomou uma acao concreta por causa do conteudo: comecou tratamento, marcou consulta, mudou rotina.',
    keywords: [
      'comecou tratamento', 'iniciou tratamento', 'inicio de tratamento', 'iniciar tratamento',
      'marquei consulta', 'agendou consulta', 'agendei', 'agendamento',
      'buscar ajuda', 'buscou ajuda', 'procurei ajuda', 'procurou ajuda',
      'fui diagnosticad', 'foi diagnosticad', 'buscar diagnostico',
      'tomei atitude', 'tomou atitude', 'decidiu se cuidar',
      'comecou a jogar', 'coloco em pratica', 'colocar em pratica', 'vou aplicar',
      'mudou meu dia', 'mudou minha vida', 'vai mudar minha vida', 'transformou',
      'implementar', 'implementou', 'aplica todo o protocolo',
      'motivou busca', 'motivou a buscar', 'motivou agendamento',
      'comecou a se entender', 'comecou a seguir',
      'melhorou significativamente', 'virou outra pessoa',
      'fez aceitar', 'decisao de se cuidar',
      'vou procurar ajuda', 'partiu procurar', 'procurar ajuda',
      'vou buscar', 'vou marcar', 'vou agendar',
      'salvou video', 'vou colocar em pratica', 'vou aplicar',
      'ja usava estrategias', 'aplica', 'protocolo',
      'estrategias do video', 'dicas do video',
      'maratonando', 'me inscrevi', 'ganhou inscrit',
      'feliz com o resultado', 'estou feliz', 'deu resultado',
      'funciona', 'funcionou', 'deu certo',
      'estou melhor', 'me sinto melhor', 'vida melhor',
    ],
  },
  {
    id: 'transformacao_relacional',
    name: 'Transformacao: mudou uma relacao',
    emoji: '\u{1F91D}',
    description: 'Conteudo mudou como a pessoa se relaciona: familia entendeu, casamento melhorou, enviou pra alguem.',
    keywords: [
      'mae entendeu', 'pai entendeu', 'familia entendeu', 'marido entendeu', 'esposa entendeu',
      'entendeu a filha', 'entendeu o filho', 'entendeu o marido', 'entendeu a esposa',
      'entendeu que marido', 'entendeu que esposa',
      'mandou pra', 'mandei pra', 'enviei pro', 'enviei pra', 'mandou video',
      'mostrei pra', 'mostrou pra',
      'explicou pra esposa', 'explicou pra familia',
      'filho melhorou', 'filha melhorou', 'neto melhorou',
      'casamento', 'namorada', 'namorado', 'briga com',
      'mae de filho', 'ajudar o filho', 'ajuda-lo',
      'familia inteira', 'dinamica familiar',
      'dividiu com', 'compartilhou com irmaos',
      'pra alguem que amo', 'entender a pessoa',
      'ajudar a pessoa', 'ajudar alguem',
      'entender pessoa que ama',
    ],
  },
  {
    id: 'transformacao_emocional',
    name: 'Transformacao: alivio emocional',
    emoji: '\u{1F4A7}',
    description: 'Pessoa sentiu alivio profundo: chorou, tirou peso, parou de se culpar, sentiu-se normal.',
    keywords: [
      'chorou', 'chorei', 'quase chorou', 'lacrimej', 'lagrima',
      'alivio', 'alívio', 'tirou um peso', 'peso das costas', '100 quilos',
      'parou de se culpar', 'libertou', 'libertacao', 'libertador', 'libertada',
      'se sentiu normal', 'ser normal', 'pessoa normal',
      'finalmente entendi', 'finalmente entendeu', 'finalmente comecou',
      'primeira vez', 'pela primeira vez',
      'tirei uma venda', 'tirou uma venda', 'abriu os olhos',
      'nao e defeito', 'nao e frieza', 'nao e doida', 'nao e burra', 'nao e preguica',
      'parou de se cobrar', 'cobra menos', 'autocompaixao',
      'acolhida', 'compreendida', 'compreendido',
      'luto e alivio', 'esperanca', 'lufada de esperanca',
      'descreveu minha vida', 'descreveu sua vida', 'minha biografia',
      'contou minha historia', 'resumo sobre eu',
      'me descreveu', 'me vi em', 'me identifiquei com todos',
      'se sentiu descrit', 'se sentiu compreendid',
      'sente-se descrit', 'nunca tao representad',
      'ajudou muito', 'ajudou bastante', 'me ajudou muito',
      'me ajudou demais', 'ajudou significativamente',
      'encontrou paz', 'paz', 'venci',
      'explicou o que sinto', 'entendeu o que sinto',
      'se sentir entendid', 'sentiu entendid',
      'utilidade publica',
    ],
  },
  {
    id: 'validacao_autoridade',
    name: 'Validacao: profissional confirma',
    emoji: '\u{1F3C5}',
    description: 'Profissional de saude, educacao ou area tecnica valida o conteudo.',
    keywords: [
      'sou profissional', 'sou psicologo', 'sou psicologa', 'sou psiquiatra',
      'sou medic', 'sou terapeuta', 'sou enfermeira',
      'como medico', 'como psicologa', 'como profissional',
      'psicoterapeuta', 'professor de faculdade', 'ex-professor',
      'anos de experiencia', '27 anos', 'anos de carreira',
      'base em evidencias', 'consistencia academica',
      'indicar canal para pacientes', 'impacto profissional',
      'profissional de saude', 'especialistas internacionais',
    ],
  },
  {
    id: 'validacao_comparacao',
    name: 'Validacao: melhor que alternativa paga',
    emoji: '\u{1F947}',
    description: 'Compara o conteudo favoravelmente com cursos, terapeutas, psiquiatras, outros canais.',
    keywords: [
      'melhor que', 'melhor do que', 'melhor explicacao',
      'melhor video', 'melhor canal', 'melhor aula',
      'melhor conteudo',
      'cursos caros', 'resume conteudo de cursos',
      'terapia nunca', 'meu psicologo nunca', 'meu psiquiatra nunca',
      'nenhum profissional', 'nenhum terapeuta',
      'nunca nenhum', 'nunca tao', 'nunca tinha',
      'mais assertivo', 'mais didatico',
      'diferente dos outros', 'lacuna', 'supre lacuna',
      'ninguem nunca explicou', 'nunca vi', 'nunca viu',
      'clareza inedita', 'explicacao inedita',
    ],
  },
  {
    id: 'amplificacao',
    name: 'Amplificacao: espalhou pra outros',
    emoji: '\u{1F4E2}',
    description: 'Pessoa compartilhou, recomendou, inscreveu outros, mandou pra familia.',
    keywords: [
      'compartilh', 'enviei', 'mandei', 'mandando para',
      'inscrev', 'ganhou inscrit',
      'recomend', 'indic',
      'mostrei', 'vou mostrar',
      'dividiu com', 'mandou pra',
      'varias pessoas', 'todo mundo',
      'partilhei', 'partilha',
    ],
  },
];

function categorize(impacto: string, text: string): { categories: string[]; power: number } {
  const combined = ((impacto || '') + ' ' + (text || '')).toLowerCase();
  const categories: string[] = [];

  for (const cat of CATEGORIES) {
    if (cat.keywords.some(kw => combined.includes(kw.toLowerCase()))) {
      categories.push(cat.id);
    }
  }

  // Power score (1-5)
  let power = 1;
  // Has concrete action taken? (+2)
  if (categories.includes('transformacao_comportamental')) power += 2;
  else if (categories.includes('transformacao_relacional') || categories.includes('transformacao_emocional')) power += 1;
  // Has favorable comparison? (+1)
  if (categories.includes('validacao_comparacao') || categories.includes('validacao_autoridade')) power += 1;
  // Has emotional documentation? (+0.5 rounded)
  if (categories.includes('transformacao_emocional')) power += 1;
  // Any category at all vs generic
  if (categories.length === 0) power = 1;

  return { categories, power: Math.min(power, 5) };
}

async function main() {
  console.log('Categorizando prova social...\n');

  // Fetch all elogios
  let all: any[] = [];
  let offset = 0;
  while (true) {
    const { data } = await sb.from('aud_comments')
      .select('id, text, impacto_descrito, elogio_tipo, peso_social, like_count')
      .eq('tipo', 'elogio').eq('is_team', false).eq('is_channel_owner', false)
      .range(offset, offset + 999);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < 1000) break;
    offset += 1000;
  }

  console.log(`Total elogios: ${all.length}`);

  // Categorize each
  const catCounts: Record<string, number> = {};
  const catComments: Record<string, string[]> = {};
  const powerDist: Record<number, number> = {};
  let categorized = 0;

  for (const cat of CATEGORIES) {
    catCounts[cat.id] = 0;
    catComments[cat.id] = [];
  }
  catCounts['generico'] = 0;
  catComments['generico'] = [];

  for (const e of all) {
    const { categories, power } = categorize(e.impacto_descrito, e.text);
    powerDist[power] = (powerDist[power] || 0) + 1;

    if (categories.length > 0) {
      categorized++;
      for (const catId of categories) {
        catCounts[catId]++;
        catComments[catId].push(e.id);
      }
    } else {
      catCounts['generico']++;
      catComments['generico'].push(e.id);
    }
  }

  console.log(`Categorizados: ${categorized} (${Math.round(categorized / all.length * 100)}%)`);
  console.log(`Genericos: ${catCounts['generico']}\n`);

  console.log('=== POR CATEGORIA ===');
  for (const cat of CATEGORIES) {
    console.log(`  ${cat.emoji} ${cat.name}: ${catCounts[cat.id]}`);
  }
  console.log(`  \u{1F4CC} Elogios gerais: ${catCounts['generico']}`);

  console.log('\n=== POWER SCORE ===');
  for (const [score, count] of Object.entries(powerDist).sort()) {
    console.log(`  Score ${score}: ${count}`);
  }

  // Save as subclusters
  console.log('\nSalvando subclusters...');
  await sb.from('aud_subclusters').delete().eq('dimension', 'prova_social');

  for (const cat of CATEGORIES) {
    if (catComments[cat.id].length === 0) continue;

    // Get best quotes
    const sampleIds = catComments[cat.id].slice(0, 100);
    const { data: samples } = await sb.from('aud_comments')
      .select('text, impacto_descrito, peso_social')
      .in('id', sampleIds)
      .order('peso_social', { ascending: false });

    const quotes = (samples || []).slice(0, 3).map(s =>
      (s.impacto_descrito || (s.text || '').slice(0, 200))
    );

    await sb.from('aud_subclusters').insert({
      dimension: 'prova_social',
      parent_value: 'impacto',
      cluster_name: cat.name,
      cluster_description: cat.description,
      comment_ids: catComments[cat.id],
      example_quotes: quotes,
      count: catComments[cat.id].length,
    });
  }

  // Generics
  if (catComments['generico'].length > 0) {
    const sampleIds = catComments['generico'].slice(0, 100);
    const { data: samples } = await sb.from('aud_comments')
      .select('text, peso_social')
      .in('id', sampleIds)
      .order('peso_social', { ascending: false });

    const quotes = (samples || []).slice(0, 3).map(s => (s.text || '').slice(0, 200));

    await sb.from('aud_subclusters').insert({
      dimension: 'prova_social',
      parent_value: 'impacto',
      cluster_name: 'Elogios gerais',
      cluster_description: 'Elogios sem impacto especifico documentado. "Parabens", "otimo canal", "melhor video".',
      comment_ids: catComments['generico'],
      example_quotes: quotes,
      count: catComments['generico'].length,
    });
  }

  // Sample some generics to check quality
  console.log('\n=== AMOSTRA DOS GENERICOS (verificacao) ===');
  const genSample = catComments['generico'].slice(0, 50);
  const { data: genComments } = await sb.from('aud_comments')
    .select('text, impacto_descrito')
    .in('id', genSample)
    .order('peso_social', { ascending: false });

  (genComments || []).slice(0, 20).forEach((c, i) => {
    const imp = c.impacto_descrito ? ` [IMP: ${c.impacto_descrito}]` : '';
    console.log(`  ${i}: ${(c.text || '').slice(0, 120)}${imp}`);
  });

  const { count } = await sb.from('aud_subclusters').select('*', { count: 'exact', head: true }).eq('dimension', 'prova_social');
  console.log(`\nTotal prova social subclusters: ${count}`);
}

main().catch(console.error);
