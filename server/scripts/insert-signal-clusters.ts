/**
 * insert-signal-clusters.ts — Sub-clusters para sinais fortes de conteúdo, produto e copy
 */
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.SUPABASE_URL || 'https://vdaualgktroizsttbrfh.supabase.co',
  process.env.SUPABASE_KEY || ''
);

interface ClusterDef {
  dimension: string;
  parent_value: string;
  cluster_name: string;
  cluster_description: string;
  signal_field: string; // which field to search in (justificativa)
  keywords: string[];
}

const CLUSTERS: ClusterDef[] = [
  // ======= CONTEUDO (215 forte) =======
  { dimension: 'sinal_conteudo', parent_value: 'forte', signal_field: 'sinal_conteudo_justificativa',
    cluster_name: 'TDAH + Comorbidades (TEA, bipolar, TOC, ansiedade)',
    cluster_description: 'Pedidos de videos sobre TDAH combinado com outros transtornos. Diagnostico diferencial, masking, dupla excepcionalidade.',
    keywords: ['TEA', 'autismo', 'bipolar', 'TOC', 'ansiedade', 'comorbid', 'masking', 'alexitimia', 'espectro', 'borderline', 'TAG'] },
  { dimension: 'sinal_conteudo', parent_value: 'forte', signal_field: 'sinal_conteudo_justificativa',
    cluster_name: 'TDAH + Superdotacao / Altas habilidades',
    cluster_description: 'Dupla excepcionalidade: TDAH + altas habilidades/superdotacao. Confusao diagnostica, compensacao cognitiva.',
    keywords: ['superdotac', 'altas habilidades', 'dupla excepcionalidade', 'AH/SD', 'inteligent'] },
  { dimension: 'sinal_conteudo', parent_value: 'forte', signal_field: 'sinal_conteudo_justificativa',
    cluster_name: 'Relacionamentos e casais com TDAH',
    cluster_description: 'Videos sobre dinamica de casal (ambos TDAH, TDAH+neurotipico), perspectiva do parceiro, como nao destruir o casamento.',
    keywords: ['casal', 'relacionamento', 'parceiro', 'casamento', 'namoro', 'amoroso', 'neurotipico', 'convive'] },
  { dimension: 'sinal_conteudo', parent_value: 'forte', signal_field: 'sinal_conteudo_justificativa',
    cluster_name: 'Regulacao emocional e saude mental',
    cluster_description: 'Irritabilidade, sensibilidade emocional, sindrome do impostor, magoa acumulada, como desestressar.',
    keywords: ['emocional', 'irritabilidade', 'sensibilidade', 'impostor', 'magoa', 'desestressar', 'humor', 'raiva', 'culpa', 'magoado'] },
  { dimension: 'sinal_conteudo', parent_value: 'forte', signal_field: 'sinal_conteudo_justificativa',
    cluster_name: 'TDAH na vida adulta tardia (40+, 50+, 60+)',
    cluster_description: 'Diagnostico tardio, TDAH em idosos, menopausa e hormonios, eficacia de tratamento apos 60.',
    keywords: ['tardio', 'idosos', '60+', '65', '70', 'menopausa', 'hormoni', 'maturidade', 'envelhecimento'] },
  { dimension: 'sinal_conteudo', parent_value: 'forte', signal_field: 'sinal_conteudo_justificativa',
    cluster_name: 'TDAH e trabalho / carreira / estudos',
    cluster_description: 'Performance no trabalho, concursos, estudos com TDAH, vocacao, tipo de carreira ideal.',
    keywords: ['trabalho', 'carreira', 'concurso', 'estudo', 'profissional', 'professor', 'vocacion', 'performance'] },
  { dimension: 'sinal_conteudo', parent_value: 'forte', signal_field: 'sinal_conteudo_justificativa',
    cluster_name: 'TDAH e dependencia / vicios / compulsoes',
    cluster_description: 'Alcoolismo, dependencia quimica, compras compulsivas, sexo compulsivo, uso de substancias.',
    keywords: ['alcool', 'dependencia', 'vicio', 'substancia', 'compulsi', 'sexo', 'droga'] },
  { dimension: 'sinal_conteudo', parent_value: 'forte', signal_field: 'sinal_conteudo_justificativa',
    cluster_name: 'Neurocencia e cerebro TDAH',
    cluster_description: 'Perguntas sobre cortex pre-frontal, dopamina, evolucao, por que TDAH existe, como o cerebro funciona.',
    keywords: ['cortex', 'pre-frontal', 'dopamina', 'cerebro', 'evolut', 'neurociencia', 'neuroquimica'] },
  { dimension: 'sinal_conteudo', parent_value: 'forte', signal_field: 'sinal_conteudo_justificativa',
    cluster_name: 'Psicoeducacao para terceiros (pais, parceiros)',
    cluster_description: 'Pedidos de videos direcionados a quem convive com pessoa TDAH — pais, parceiros, colegas.',
    keywords: ['pais', 'filho', 'parceiro', 'terceiros', 'convive', 'mae', 'pai', 'familia'] },
  { dimension: 'sinal_conteudo', parent_value: 'forte', signal_field: 'sinal_conteudo_justificativa',
    cluster_name: 'Sono, rotina e energia',
    cluster_description: 'Como dormir, exercicio e efeito rebote, alimentacao, rotina matinal, sensibilidade sensorial.',
    keywords: ['sono', 'dormir', 'exercicio', 'alimentacao', 'rotina', 'energia', 'sensorial', 'matinal'] },
  { dimension: 'sinal_conteudo', parent_value: 'forte', signal_field: 'sinal_conteudo_justificativa',
    cluster_name: 'TDA desatento (sem hiperatividade)',
    cluster_description: 'Representatividade para TDA desatento, que se sente invisivel nos conteudos que focam hiperatividade.',
    keywords: ['desatento', 'TDA', 'sem hiperatividade', 'invisivel'] },

  // ======= PRODUTO (457 forte) =======
  { dimension: 'sinal_produto', parent_value: 'forte', signal_field: 'sinal_produto_justificativa',
    cluster_name: 'Curso / programa gravado',
    cluster_description: 'Demanda por cursos gravados sobre TDAH: pos-diagnostico, produtividade, relacionamentos, carreira.',
    keywords: ['curso', 'programa', 'modulo', 'gravado'] },
  { dimension: 'sinal_produto', parent_value: 'forte', signal_field: 'sinal_produto_justificativa',
    cluster_name: 'Guia PDF / Ebook',
    cluster_description: 'Demanda por materiais escritos: guias praticos, ebooks, manuais de sobrevivencia TDAH.',
    keywords: ['guia', 'PDF', 'ebook', 'manual', 'livro'] },
  { dimension: 'sinal_produto', parent_value: 'forte', signal_field: 'sinal_produto_justificativa',
    cluster_name: 'Workbook / Template / Ferramenta',
    cluster_description: 'Demanda por ferramentas praticas: workbooks, templates de rotina, checklists, planners adaptados.',
    keywords: ['workbook', 'template', 'ferramenta', 'checklist', 'planner', 'planilha'] },
  { dimension: 'sinal_produto', parent_value: 'forte', signal_field: 'sinal_produto_justificativa',
    cluster_name: 'Triagem / Auto-avaliacao / MAPA',
    cluster_description: 'Demanda por ferramentas de triagem, auto-avaliacao, teste online. Ponte para o MAPA-7P.',
    keywords: ['triagem', 'avaliacao', 'teste', 'MAPA', 'quiz', 'screening'] },
  { dimension: 'sinal_produto', parent_value: 'forte', signal_field: 'sinal_produto_justificativa',
    cluster_name: 'Produto para familiares / terceiros',
    cluster_description: 'Guias e cursos para quem convive com TDAH: maes, pais, parceiros, colegas.',
    keywords: ['familiar', 'mae', 'pai', 'parceiro', 'terceiro', 'convive', 'filho'] },
  { dimension: 'sinal_produto', parent_value: 'forte', signal_field: 'sinal_produto_justificativa',
    cluster_name: 'Consulta / atendimento / acesso ao profissional',
    cluster_description: 'Demanda direta por consulta, atendimento, ou alternativa acessivel ao atendimento individual.',
    keywords: ['consulta', 'atendimento', 'profissional', 'landing', 'acessivel', 'alternativa'] },
  { dimension: 'sinal_produto', parent_value: 'forte', signal_field: 'sinal_produto_justificativa',
    cluster_name: 'Produto sobre diagnostico e pos-diagnostico',
    cluster_description: 'Demanda por produtos que guiam o caminho do diagnostico ao tratamento. Pre-consulta, pos-diagnostico, luto.',
    keywords: ['diagnostico', 'pos-diagnostico', 'laudo', 'pre-consulta', 'luto', 'recem'] },
  { dimension: 'sinal_produto', parent_value: 'forte', signal_field: 'sinal_produto_justificativa',
    cluster_name: 'Produto sobre produtividade e rotina',
    cluster_description: 'Sistemas de produtividade, rotina, organizacao adaptados ao cerebro TDAH.',
    keywords: ['produtividade', 'rotina', 'organizacao', 'sistema', 'habito', 'protocolo'] },

  // ======= COPY (640 forte) =======
  { dimension: 'sinal_copy', parent_value: 'forte', signal_field: 'sinal_copy_justificativa',
    cluster_name: 'Identidade e diagnostico tardio',
    cluster_description: 'Frases sobre descobrir que tem TDAH, nao ser preguicoso, a vida que poderia ter tido.',
    keywords: ['identidade', 'diagnostico', 'preguic', 'descobri', 'vida inteira', 'nao sou', 'tardio'] },
  { dimension: 'sinal_copy', parent_value: 'forte', signal_field: 'sinal_copy_justificativa',
    cluster_name: 'Dor emocional e sofrimento',
    cluster_description: 'Frases de dor profunda: exaustao, culpa, solidao, desespero. Poder emocional alto para copy de vendas.',
    keywords: ['dor', 'sofrimento', 'culpa', 'exaust', 'solidao', 'desespero', 'cansad', 'luta'] },
  { dimension: 'sinal_copy', parent_value: 'forte', signal_field: 'sinal_copy_justificativa',
    cluster_name: 'Humor e auto-ironia',
    cluster_description: 'Frases engracadas e auto-ironicas que geram identificacao e engajamento. Otimas para thumbnails e community posts.',
    keywords: ['humor', 'ironi', 'engracad', 'piada', 'riso', 'comico', 'leveza'] },
  { dimension: 'sinal_copy', parent_value: 'forte', signal_field: 'sinal_copy_justificativa',
    cluster_name: 'Relacionamentos e saudade',
    cluster_description: 'Frases sobre nao sentir saudade, indiferenca, perda de relacionamentos, culpa por nao amar.',
    keywords: ['saudade', 'relacionamento', 'amar', 'indiferenc', 'parceiro', 'casamento', 'namoro'] },
  { dimension: 'sinal_copy', parent_value: 'forte', signal_field: 'sinal_copy_justificativa',
    cluster_name: 'Identificacao e validacao',
    cluster_description: 'Frases do tipo "esse sou eu", "me descreveu". Audiencia se ve no conteudo. Otimas para hooks de video.',
    keywords: ['identificac', 'validac', 'me descrev', 'esse sou', 'parece que me conhec', 'minha vida'] },
  { dimension: 'sinal_copy', parent_value: 'forte', signal_field: 'sinal_copy_justificativa',
    cluster_name: 'Impacto e transformacao',
    cluster_description: 'Frases sobre como o canal mudou a vida. Testimoniais reais de transformacao. Prova social premium.',
    keywords: ['mudou', 'transformou', 'impacto', 'mudanca', 'ajudou', 'salvou', 'vida mudou'] },
  { dimension: 'sinal_copy', parent_value: 'forte', signal_field: 'sinal_copy_justificativa',
    cluster_name: 'Produtividade e paralisia',
    cluster_description: 'Frases sobre procrastinacao, paralisia, nao conseguir fazer coisas simples. Dor do dia a dia.',
    keywords: ['produtividade', 'procrastina', 'paralisia', 'trava', 'nao consigo', 'simples'] },
];

async function main() {
  console.log('Inserindo clusters de sinais...\n');

  for (const dim of ['sinal_conteudo', 'sinal_produto', 'sinal_copy']) {
    await sb.from('aud_subclusters').delete().eq('dimension', dim);
  }

  for (const sc of CLUSTERS) {
    // Fetch all forte comments for this signal
    const signalCol = sc.dimension.replace('sinal_', 'sinal_') as string;
    const all: any[] = [];
    let offset = 0;
    while (true) {
      const { data } = await sb.from('aud_comments')
        .select(`id, ${sc.signal_field}, peso_social, text`)
        .eq(signalCol, 'forte').eq('is_team', false)
        .range(offset, offset + 999);
      if (!data || data.length === 0) break;
      all.push(...data);
      if (data.length < 1000) break;
      offset += 1000;
    }

    const matching = all.filter(c => {
      const just = ((c as any)[sc.signal_field] || '').toLowerCase();
      const text = (c.text || '').toLowerCase();
      return sc.keywords.some(kw => just.includes(kw.toLowerCase()) || text.includes(kw.toLowerCase()));
    });

    const quotes = matching
      .sort((a, b) => b.peso_social - a.peso_social)
      .slice(0, 3)
      .map(c => (c.text || '').slice(0, 200));

    const { error } = await sb.from('aud_subclusters').insert({
      dimension: sc.dimension,
      parent_value: sc.parent_value,
      cluster_name: sc.cluster_name,
      cluster_description: sc.cluster_description,
      comment_ids: matching.map(c => c.id),
      example_quotes: quotes,
      count: matching.length,
    });

    if (error) console.error('Error:', sc.cluster_name, error.message);
    else console.log(`  [${sc.dimension}] ${sc.cluster_name}: ${matching.length}`);
  }

  // Summary
  for (const dim of ['sinal_conteudo', 'sinal_produto', 'sinal_copy']) {
    const { count } = await sb.from('aud_subclusters').select('*', { count: 'exact', head: true }).eq('dimension', dim);
    console.log(`\n${dim}: ${count} clusters`);
  }
}

main().catch(console.error);
