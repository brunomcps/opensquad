import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.SUPABASE_URL || 'https://vdaualgktroizsttbrfh.supabase.co',
  process.env.SUPABASE_KEY || ''
);

const clusters = [
  {
    parent_value: 'rotina_matinal',
    cluster_name: 'Rotina matinal e despertar',
    cluster_description: 'Sistemas para acordar e comecar o dia: luz natural (cortinas abertas), banho frio, exercicio matinal, musica, cafe, Alexa com alarmes. Os mais validados pela audiencia.',
    keywords: ['acordar', 'cortina', 'luz natural', 'manha', 'matinal', 'despertar', 'despertador', 'banho frio', 'banho gelado', 'sol', 'levantar', 'agua gelada', 'agua no rosto', 'persiana', 'blackout']
  },
  {
    parent_value: 'estudo_aprendizado',
    cluster_name: 'Metodos de estudo e aprendizado',
    cluster_description: 'Tecnicas para estudar com TDAH: flash cards manuais, resumos, mapas mentais, ensinar para outros, estudo ativo, IA como ferramenta.',
    keywords: ['estudo', 'estudar', 'flash card', 'mapa mental', 'resumo', 'anotacao', 'anotar', 'questoes', 'ensinar', 'explicar', 'memoriz', 'concurso', 'vestibular', 'faculdade', 'prova', 'aula', 'aprendiz']
  },
  {
    parent_value: 'organizacao_sistemas',
    cluster_name: 'Sistemas de organizacao e memoria externa',
    cluster_description: 'Ferramentas para compensar memoria e desorganizacao: alarmes, Alexa, agenda Google, post-its, caixas organizadoras, etiquetas, calendario na geladeira.',
    keywords: ['alarme', 'Alexa', 'agenda', 'calendario', 'lembrete', 'caixa', 'etiquet', 'organiz', 'guardar', 'descartar', 'doar', 'setor', 'lugar fixo', 'purgatorio', 'quarentena', 'bilhete', 'caderno']
  },
  {
    parent_value: 'exercicio_corpo',
    cluster_name: 'Exercicio fisico e corpo',
    cluster_description: 'Academia, corrida, pedal, caminhada como reguladores de TDAH. Muitos reportam que e a unica coisa que realmente funciona para foco e energia.',
    keywords: ['academia', 'exercicio', 'treino', 'correr', 'corrida', 'pedal', 'caminhada', 'atividade fisica', 'musculacao', 'esteira', 'cardio']
  },
  {
    parent_value: 'gestao_tempo_pontualidade',
    cluster_name: 'Gestao de tempo e pontualidade',
    cluster_description: 'Estrategias para chegar no horario: chegar 30min adiantado, preparar tudo na vespera, planejamento reverso, pomodoro com timer fisico.',
    keywords: ['adiantado', 'vespera', 'pontual', 'atraso', 'horario fixo', 'pomodoro', 'timer', 'cronometr', 'gordura', 'reverso', 'etapa', 'preparar']
  },
  {
    parent_value: 'medicacao_suplementos',
    cluster_name: 'Medicacao e suplementos',
    cluster_description: 'Experiencias com Ritalina, Venvanse, L-Teanina, B12, melatonina. Relatos de resultados concretos.',
    keywords: ['Ritalina', 'Venvanse', 'medicacao', 'B12', 'L-Teanina', 'melatonina', 'suplemento', 'capsul', 'injecao', 'remedio']
  },
  {
    parent_value: 'regulacao_emocional_metodos',
    cluster_name: 'Regulacao emocional e autoconhecimento',
    cluster_description: 'Meditacao, artesanato, danca, musica, terapia, ressignificacao. Metodos para lidar com explosoes e esgotamento emocional.',
    keywords: ['meditacao', 'artesanato', 'danca', 'terapia', 'autoconhecimento', 'autoaceitacao', 'respirar', 'regulacao', 'calma', 'ressignificac', 'canto', 'cannabis', 'oleo essencial']
  },
  {
    parent_value: 'produtividade_foco',
    cluster_name: 'Hacks de produtividade e foco',
    cluster_description: 'Gamificacao, microtarefas, recompensas, mudar ambiente, barulho de fundo, hiperfoco direcionado, "pequenos atos completos".',
    keywords: ['gamific', 'microtarefa', 'recompensa', 'ambiente', 'barulho de fundo', 'hiperfoco', 'pequenos atos', 'completar', 'celular', 'limitar uso', 'joguinho']
  },
  {
    parent_value: 'alimentacao_sono',
    cluster_name: 'Alimentacao e sono',
    cluster_description: 'Mudancas alimentares (cortar acucar, cafeina apos 16h, proteina), rotinas de sono. Impacto direto na energia e foco.',
    keywords: ['alimentacao', 'acucar', 'cafeina', 'proteina', 'sono', 'pao', 'dieta', 'comer', 'insonia', 'dormir cedo', 'dormir as']
  },
  {
    parent_value: 'relacionamentos_sociais',
    cluster_name: 'Estrategias para relacionamentos',
    cluster_description: 'Dia fixo para mandar mensagem, ligar no carro, frases prontas, dizer nao para convites, encontrar tribos compativeis.',
    keywords: ['mensagem', 'ligar para', 'amigo', 'vinculo', 'social', 'tribo', 'nerd', 'convite', 'parceiro', 'comunicacao', 'WhatsApp', 'bom dia']
  },
  {
    parent_value: 'carreira_trabalho',
    cluster_name: 'Adaptacoes para trabalho e carreira',
    cluster_description: 'Escolher carreira alinhada ao hiperfoco, usar pressao como combustivel, intercalar trabalho mental com manual.',
    keywords: ['trabalho', 'carreira', 'empresa', 'empreendedor', 'home office', 'escritorio', 'manual', 'professor', 'CEO', 'day trade']
  }
];

async function main() {
  console.log('Inserindo clusters de metodos...\n');

  // Get all forte method comments
  const all: any[] = [];
  let offset = 0;
  while (true) {
    const { data } = await sb.from('aud_comments')
      .select('id, sinal_metodo_justificativa, peso_social, text')
      .eq('sinal_metodo', 'forte').eq('is_team', false)
      .range(offset, offset + 999);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < 1000) break;
    offset += 1000;
  }
  console.log('Total metodos forte:', all.length);

  // Delete existing
  await sb.from('aud_subclusters').delete().eq('dimension', 'metodo_testado');

  for (const sc of clusters) {
    const matching = all.filter(c => {
      const just = (c.sinal_metodo_justificativa || '').toLowerCase();
      const text = (c.text || '').toLowerCase();
      return sc.keywords.some(kw => just.includes(kw.toLowerCase()) || text.includes(kw.toLowerCase()));
    });

    const quotes = matching
      .sort((a, b) => b.peso_social - a.peso_social)
      .slice(0, 3)
      .map(c => (c.text || '').slice(0, 200));

    const { error } = await sb.from('aud_subclusters').insert({
      dimension: 'metodo_testado',
      parent_value: sc.parent_value,
      cluster_name: sc.cluster_name,
      cluster_description: sc.cluster_description,
      comment_ids: matching.map(c => c.id),
      example_quotes: quotes,
      count: matching.length,
    });

    if (error) console.error('Error:', sc.cluster_name, error.message);
    else console.log(`  ${sc.cluster_name}: ${matching.length} metodos`);
  }

  const { count } = await sb.from('aud_subclusters').select('*', { count: 'exact', head: true }).eq('dimension', 'metodo_testado');
  console.log(`\nTotal method clusters: ${count}`);
}

main().catch(console.error);
