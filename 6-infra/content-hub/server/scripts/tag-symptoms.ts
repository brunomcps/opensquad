/**
 * tag-symptoms.ts — Tag all comments with symptom mentions
 * Uses keyword matching with Bruno's clinical terms + audience colloquial terms
 * Stores results in aud_subclusters (dimension='sintoma') for each symptom
 * Also updates aud_comments.insights_extraidos with symptom list per comment
 */
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.SUPABASE_URL || 'https://vdaualgktroizsttbrfh.supabase.co',
  process.env.SUPABASE_KEY || ''
);

interface SymptomDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
  keywords: string[];
  exclude?: string[]; // keywords that disqualify a match
}

const SYMPTOMS: SymptomDef[] = [
  {
    id: 'esquecimento', name: 'Esquecimento e memoria', emoji: '\u{1F4AD}',
    description: 'Memoria de peneira, esquecer compromissos, dar branco, perder objetos.',
    keywords: ['esquec', 'memoria', 'peneira', 'nao lembro', 'branco', 'esqueço', 'esqueci'],
  },
  {
    id: 'hiperfoco', name: 'Hiperfoco', emoji: '\u{1F50D}',
    description: 'Foco intenso e incontrolavel em algo, horas sem perceber, nao conseguir parar.',
    keywords: ['hiperfoco', 'hiper foco', 'nao consigo parar', 'horas seguidas', 'obsess', 'foquei'],
  },
  {
    id: 'procrastinacao', name: 'Procrastinacao', emoji: '\u{1F6D1}',
    description: 'Adiar tarefas, deixar pro ultimo minuto, procrastinacao de vinganca.',
    keywords: ['procrastin', 'adiar', 'ultimo minuto', 'deixo pra depois', 'celular ate tarde', 'procrastinacao de vinganca'],
  },
  {
    id: 'desatencao', name: 'Desatencao e falta de foco', emoji: '\u{1F4A8}',
    description: 'Nao conseguir prestar atencao, distrair facil, perder o fio da meada.',
    keywords: ['desatent', 'perco o foco', 'falta de foco', 'sem foco', 'nao consigo focar', 'distra', 'desligad', 'mundo da lua', 'viajando', 'avoada', 'avuada', 'cabeca nas nuvens', 'atencao'],
    exclude: ['desatento sutil'],
  },
  {
    id: 'insonia', name: 'Insonia e problemas de sono', emoji: '\u{1F319}',
    description: 'Nao conseguir dormir, acordar cansado, madrugada, sono irregular.',
    keywords: ['insonia', 'nao consigo dormir', 'nao durmo', 'madrugada', 'virar a noite', 'acordar cedo', 'acordar cansad', 'dormir tarde', 'durmo tarde', '3 da manha', '4 da manha', '2 da manha', 'melatonina'],
    exclude: ['sono bom'],
  },
  {
    id: 'exaustao', name: 'Exaustao e fadiga cronica', emoji: '\u{1F6CF}\u{FE0F}',
    description: 'Cansaco extremo, sem energia, esgotamento que nao passa com descanso.',
    keywords: ['exaust', 'cansac', 'cansad', 'esgota', 'fadiga', 'sem energia', 'falta de energia', 'morto de cansac'],
  },
  {
    id: 'paralisia_executiva', name: 'Paralisia executiva', emoji: '\u{1F9CA}',
    description: 'Travar diante de tarefas, nao conseguir comecar, congelar, paralisia de espera.',
    keywords: ['paralisia', 'travo', 'travei', 'travado', 'congelo', 'congelad', 'nao consigo comecar', 'paralisia de espera', 'trava', 'interromper', 'dia inteiro'],
  },
  {
    id: 'cegueira_temporal', name: 'Cegueira temporal e atrasos', emoji: '\u{23F0}',
    description: 'Perder nocao do tempo, chegar atrasado, nao dimensionar prazos.',
    keywords: ['cegueira temporal', 'atraso', 'atrasad', 'nocao de tempo', 'perco a nocao', 'tempo nao existe', 'pontualidade'],
  },
  {
    id: 'montanha_russa', name: 'Montanha-russa emocional', emoji: '\u{1F3A2}',
    description: 'Explosoes emocionais, raiva intensa, ir de 0 a 1000 em segundos.',
    keywords: ['montanha-russa', 'montanha russa', 'explod', 'explodi', 'explodir', 'pavio curto', '0 a 1000', 'explosao'],
  },
  {
    id: 'sensibilidade_rejeicao', name: 'Sensibilidade a rejeicao', emoji: '\u{1F494}',
    description: 'Dor com criticas, medo de rejeicao, sensibilidade extrema a feedback negativo.',
    keywords: ['rejeicao', 'rejeição', 'sensivel a critica', 'critica me', 'magoa', 'sensibilidade'],
  },
  {
    id: 'autoestima_culpa', name: 'Autoestima destruida e culpa', emoji: '\u{1F614}',
    description: 'Se sentir inutil, fracassado, preguicoso, defeituoso. Culpa cronica, vergonha, sindrome do impostor.',
    keywords: ['culpa', 'vergonha', 'inutil', 'fracasso', 'preguicos', 'defeituos', 'monstro', 'impostor', 'impostora', 'fraude', 'me sinto um lixo'],
  },
  {
    id: 'saudade_indiferenca', name: 'Saudade e indiferenca emocional', emoji: '\u{2744}\u{FE0F}',
    description: 'Nao sentir saudade, nao ligar pra ninguem, frieza emocional involuntaria.',
    keywords: ['saudade', 'nao sinto falta', 'indiferenc', 'nao ligo', 'nao me importo', 'enjoar das pessoas', 'nao sinto saudade', 'nao sente saudade', 'frio emocional'],
  },
  {
    id: 'desorganizacao', name: 'Desorganizacao e acumulo', emoji: '\u{1F4E6}',
    description: 'Casa baguncada, acumular coisas, nao conseguir organizar, jogar fora.',
    keywords: ['desorganiz', 'bagunca', 'baguncad', 'acumul', 'acumulando', 'jogar fora', 'guardar coisas'],
  },
  {
    id: 'projetos_inacabados', name: 'Projetos inacabados', emoji: '\u{1F3D7}\u{FE0F}',
    description: 'Nao terminar o que comeca, mil projetos pela metade, iniciar e abandonar.',
    keywords: ['pela metade', 'tudo pela metade', 'nao termino', 'nao termina', 'nao concluo', 'nao consigo terminar', 'mil coisas', 'milhao de coisas', 'projeto inacab', 'nunca termino', 'nunca termina', 'comeco e nao', 'começo e não', 'nunca concluo', 'nunca termino nada'],
  },
  {
    id: 'impulsividade', name: 'Impulsividade e compulsao', emoji: '\u{26A1}',
    description: 'Agir sem pensar, compras compulsivas, falar demais, decisoes impulsivas.',
    keywords: ['impulsi', 'impulso', 'sem pensar', 'compulsiva', 'compulsivo', 'gastando', 'falo demais', 'fala demais', 'sem filtro', 'compras'],
  },
  {
    id: 'ansiedade', name: 'Ansiedade', emoji: '\u{1F630}',
    description: 'Ansiedade generalizada, panico, fobia social, pensamentos acelerados.',
    keywords: ['ansiedade', 'ansios', 'panico', 'fobia social'],
  },
  {
    id: 'mascaramento', name: 'Mascaramento', emoji: '\u{1F3AD}',
    description: 'Fingir normalidade, esconder sintomas, ninguem percebe, mascara social.',
    keywords: ['mascarar', 'mascara', 'fingir', 'escond', 'ninguem perceb', 'ninguem sabe', 'disfarc'],
  },
  {
    id: 'agitacao', name: 'Agitacao e inquietude', emoji: '\u{1F3C3}',
    description: 'Nao parar quieto, inquietude, agitacao fisica ou mental constante.',
    keywords: ['inquiet', 'agitad', 'nao paro quiet', 'na pilha', 'nao consigo ficar parad'],
  },
  {
    id: 'hiperatividade_mental', name: 'Hiperatividade mental', emoji: '\u{1F9E0}',
    description: 'Mente que nao para, pensamentos acelerados, mil abas abertas no cerebro.',
    keywords: ['cabeca nao para', 'mente nao para', 'pensamento acelerado', 'pensamentos acelerados', 'mil abas', 'mente acelerada', 'cerebro nao para', 'nao consigo desligar', 'cabeça nao para', 'cabeça a mil', 'pensamentos em excesso', 'mente a mil', 'confusao mental', 'pensando demais'],
  },
  {
    id: 'dificuldade_rotina', name: 'Dificuldade com rotina', emoji: '\u{1F504}',
    description: 'Nao conseguir manter rotina, habitos impossiveis, constancia zero.',
    keywords: ['rotina', 'habito', 'constancia', 'manter rotina', 'rotina matinal', 'nao consigo manter', 'disciplina', 'regularidade'],
  },
];

async function main() {
  console.log('Tageando comentarios com sintomas...\n');

  // Fetch ALL non-team comments (paginated)
  const all: any[] = [];
  let offset = 0;
  while (true) {
    const { data } = await sb.from('aud_comments')
      .select('id, text')
      .eq('is_team', false).eq('is_channel_owner', false)
      .range(offset, offset + 999);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < 1000) break;
    offset += 1000;
  }
  console.log(`Total comments: ${all.length}`);

  // Tag each comment
  const commentSymptoms: Record<string, string[]> = {};
  const symptomComments: Record<string, string[]> = {};

  for (const symptom of SYMPTOMS) {
    symptomComments[symptom.id] = [];
  }

  for (const c of all) {
    const text = (c.text || '').toLowerCase();
    const tags: string[] = [];

    for (const symptom of SYMPTOMS) {
      const matched = symptom.keywords.some(kw => text.includes(kw.toLowerCase()));
      const excluded = symptom.exclude?.some(kw => text.includes(kw.toLowerCase()));

      if (matched && !excluded) {
        tags.push(symptom.id);
        symptomComments[symptom.id].push(c.id);
      }
    }

    if (tags.length > 0) {
      commentSymptoms[c.id] = tags;
    }
  }

  // Stats
  const tagged = Object.keys(commentSymptoms).length;
  const untagged = all.length - tagged;
  console.log(`\nTagged: ${tagged} (${Math.round(tagged / all.length * 100)}%)`);
  console.log(`Untagged: ${untagged} (${Math.round(untagged / all.length * 100)}%)`);

  // Distribution of tag count per comment
  const tagCounts: Record<number, number> = {};
  for (const tags of Object.values(commentSymptoms)) {
    const n = tags.length;
    tagCounts[n] = (tagCounts[n] || 0) + 1;
  }
  console.log('\nTags per comment:');
  for (const [n, count] of Object.entries(tagCounts).sort((a, b) => Number(a[0]) - Number(b[0]))) {
    console.log(`  ${n} tags: ${count} comments`);
  }

  // Symptom frequency
  console.log('\nSintomas por frequencia:');
  const sorted = SYMPTOMS.map(s => ({ ...s, count: symptomComments[s.id].length }))
    .sort((a, b) => b.count - a.count);
  for (const s of sorted) {
    console.log(`  ${s.emoji} ${s.count.toString().padStart(5)} ${s.name}`);
  }

  // Save to aud_subclusters (dimension='sintoma')
  console.log('\nSalvando subclusters de sintomas...');
  await sb.from('aud_subclusters').delete().eq('dimension', 'sintoma');

  for (const symptom of sorted) {
    const ids = symptomComments[symptom.id];
    if (ids.length === 0) continue;

    // Get top quotes
    const sampleIds = ids.slice(0, 100);
    const { data: samples } = await sb.from('aud_comments')
      .select('text, peso_social')
      .in('id', sampleIds)
      .order('peso_social', { ascending: false });

    const quotes = (samples || []).slice(0, 3).map(s => (s.text || '').slice(0, 200));

    await sb.from('aud_subclusters').insert({
      dimension: 'sintoma',
      parent_value: 'todos',
      cluster_name: symptom.name,
      cluster_description: symptom.description,
      comment_ids: ids,
      example_quotes: quotes,
      count: ids.length,
    });
  }

  // Update each comment's insights_extraidos with symptom tags
  console.log('\nAtualizando insights_extraidos com sintomas...');
  const entries = Object.entries(commentSymptoms);
  let updated = 0;
  for (let i = 0; i < entries.length; i += 50) {
    const batch = entries.slice(i, i + 50);
    for (const [id, tags] of batch) {
      await sb.from('aud_comments')
        .update({ insights_extraidos: tags })
        .eq('id', id);
    }
    updated += batch.length;
    if (updated % 500 === 0) console.log(`  ${updated}/${entries.length}...`);
  }
  console.log(`  ${updated} comments updated.`);

  // Co-occurrence matrix
  console.log('\n=== CO-OCORRENCIA (top 20 pares) ===');
  const pairs: Record<string, number> = {};
  for (const tags of Object.values(commentSymptoms)) {
    if (tags.length < 2) continue;
    for (let i = 0; i < tags.length; i++) {
      for (let j = i + 1; j < tags.length; j++) {
        const key = [tags[i], tags[j]].sort().join(' + ');
        pairs[key] = (pairs[key] || 0) + 1;
      }
    }
  }
  const topPairs = Object.entries(pairs).sort((a, b) => b[1] - a[1]).slice(0, 20);
  for (const [pair, count] of topPairs) {
    console.log(`  ${count.toString().padStart(4)} ${pair}`);
  }

  const { count: totalSc } = await sb.from('aud_subclusters').select('*', { count: 'exact', head: true }).eq('dimension', 'sintoma');
  console.log(`\nTotal symptom subclusters: ${totalSc}`);
  console.log('Done.');
}

main().catch(console.error);
