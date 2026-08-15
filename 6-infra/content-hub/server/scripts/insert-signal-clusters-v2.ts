/**
 * insert-signal-clusters-v2.ts — Sub-clusters CORRIGIDOS
 * Busca APENAS na justificativa (não no texto do comentário)
 * Keywords mais específicas para evitar falsos positivos
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
  signal_field: string;
  keywords: string[]; // matched ONLY against justificativa
}

const CLUSTERS: ClusterDef[] = [
  // ======= CONTEUDO (215 forte) =======
  { dimension: 'sinal_conteudo', parent_value: 'forte', signal_field: 'sinal_conteudo_justificativa',
    cluster_name: 'TDAH + TEA / Autismo / Masking',
    cluster_description: 'Pedidos de videos sobre TDAH combinado com TEA/autismo, masking, alexitimia, duplo diagnostico.',
    keywords: ['TEA', 'autismo', 'autista', 'masking', 'alexitimia', 'espectro autista'] },
  { dimension: 'sinal_conteudo', parent_value: 'forte', signal_field: 'sinal_conteudo_justificativa',
    cluster_name: 'TDAH + Bipolar / TOC / Ansiedade',
    cluster_description: 'Comorbidades psiquiatricas: bipolar, TOC, TAG, borderline, panico, depressao. Diagnostico diferencial.',
    keywords: ['bipolar', 'TOC', 'TAG', 'borderline', 'panico', 'diferencial diagnostico', 'depressao como colateral', 'ansiedade social', 'comorbidade'] },
  { dimension: 'sinal_conteudo', parent_value: 'forte', signal_field: 'sinal_conteudo_justificativa',
    cluster_name: 'Superdotacao / Altas habilidades / Dupla excepcionalidade',
    cluster_description: 'TDAH + superdotacao, confusao diagnostica, compensacao cognitiva, auto-sabotagem em inteligentes.',
    keywords: ['superdotac', 'altas habilidades', 'dupla excepcionalidade', 'AH/SD', 'AHSD'] },
  { dimension: 'sinal_conteudo', parent_value: 'forte', signal_field: 'sinal_conteudo_justificativa',
    cluster_name: 'Relacionamentos e casais',
    cluster_description: 'Casais com TDAH (ambos ou um), perspectiva do parceiro neurotipico, dinamica conjugal, narcisistas.',
    keywords: ['casal', 'parceiro', 'casamento', 'amoroso', 'neurotipico', 'convive', 'esposa', 'narcisist', 'relacao amorosa', 'poliamor', 'dating'] },
  { dimension: 'sinal_conteudo', parent_value: 'forte', signal_field: 'sinal_conteudo_justificativa',
    cluster_name: 'Emocoes e regulacao emocional',
    cluster_description: 'Irritabilidade, sensibilidade, sindrome do impostor, magoa, desestressar, auto-julgamento, culpa.',
    keywords: ['emocional', 'irritabilidade', 'sensibilidade', 'impostor', 'magoa', 'desestressar', 'regulacao emocional', 'humor', 'auto-julgamento', 'autocobranca'] },
  { dimension: 'sinal_conteudo', parent_value: 'forte', signal_field: 'sinal_conteudo_justificativa',
    cluster_name: 'Menopausa, hormonios e TDAH feminino',
    cluster_description: 'Piora de sintomas com menopausa/andropausa, TDAH em mulheres, conteudo feminino, hormonal.',
    keywords: ['menopausa', 'hormoni', 'andropausa', 'mulheres com TDAH', 'feminino', 'generos'] },
  { dimension: 'sinal_conteudo', parent_value: 'forte', signal_field: 'sinal_conteudo_justificativa',
    cluster_name: 'Vicios, dependencia e compulsoes',
    cluster_description: 'Alcoolismo, drogas, compras compulsivas, sexo, jogos de aposta. TDAH como fator de risco.',
    keywords: ['alcool', 'dependencia', 'vicio', 'substancia', 'compuls', 'sexo', 'droga', 'aposta', 'adiccao'] },
  { dimension: 'sinal_conteudo', parent_value: 'forte', signal_field: 'sinal_conteudo_justificativa',
    cluster_name: 'Trabalho e carreira',
    cluster_description: 'TDAH no trabalho corporativo, demissao, concursos, vocacao, empreendedorismo, trabalho noturno.',
    keywords: ['trabalho', 'carreira', 'concurso', 'corporativo', 'demissao', 'profissional', 'empreendedorismo', 'noturno', 'vocacion'] },
  { dimension: 'sinal_conteudo', parent_value: 'forte', signal_field: 'sinal_conteudo_justificativa',
    cluster_name: 'Familia: pais, filhos, maternidade',
    cluster_description: 'Como pais orientam filhos adultos com TDAH, maes com TDAH, TDAH intergeracional.',
    keywords: ['pais orientam', 'mae e filho', 'maternidade', 'filhos', 'pais de criancas', 'intergeracional', 'familiar'] },
  { dimension: 'sinal_conteudo', parent_value: 'forte', signal_field: 'sinal_conteudo_justificativa',
    cluster_name: 'Sono, exercicio e alimentacao',
    cluster_description: 'Como dormir, efeito rebote do exercicio, alimentacao, sensibilidade sensorial, processamento auditivo.',
    keywords: ['dormir', 'sono', 'exercicio', 'alimentac', 'sensorial', 'auditivo', 'melatonina', 'proteica'] },
  { dimension: 'sinal_conteudo', parent_value: 'forte', signal_field: 'sinal_conteudo_justificativa',
    cluster_name: 'Neurociencia e cerebro',
    cluster_description: 'Cortex pre-frontal, dopamina, evolucao, marcador biologico, como o cerebro TDAH funciona.',
    keywords: ['cortex', 'pre-frontal', 'dopamina', 'evolut', 'biologico', 'neuromodulacao', 'cerebro'] },
  { dimension: 'sinal_conteudo', parent_value: 'forte', signal_field: 'sinal_conteudo_justificativa',
    cluster_name: 'Diagnostico tardio e idosos',
    cluster_description: 'TDAH em idosos 60+, diagnostico tardio, TDAH que surge com o tempo, falso negativo, acesso SUS.',
    keywords: ['idoso', '60+', '72 anos', 'tardio', 'surgir com o tempo', 'falso negativo', 'SUS', 'acesso'] },
  { dimension: 'sinal_conteudo', parent_value: 'forte', signal_field: 'sinal_conteudo_justificativa',
    cluster_name: 'Medicacao e tratamento',
    cluster_description: 'Videos sobre medicacao (Ritalina, estimulantes), efeitos, quando usar, neuromodulacao.',
    keywords: ['medicac', 'Ritalina', 'estimulantes', 'tratamento', 'suplemento'] },

  // ======= PRODUTO (456 forte) =======
  { dimension: 'sinal_produto', parent_value: 'forte', signal_field: 'sinal_produto_justificativa',
    cluster_name: 'Diagnostico e proximo passo',
    cluster_description: 'Pessoas que suspeitam, querem saber se tem, ou acabaram de descobrir. Buscam direcao.',
    keywords: ['diagnostico', 'suspeita', 'clareza diagnostica', 'preguica', 'nao sabe', 'duvida'] },
  { dimension: 'sinal_produto', parent_value: 'forte', signal_field: 'sinal_produto_justificativa',
    cluster_name: 'Pos-diagnostico e reconstrucao',
    cluster_description: 'Ja diagnosticados mas perdidos. Reconstruir vida, luto, multiplas areas destruidas.',
    keywords: ['pos-diagnostico', 'reconstruir', 'diagnostico recente', 'luto', 'multiplas areas', 'recomeço'] },
  { dimension: 'sinal_produto', parent_value: 'forte', signal_field: 'sinal_produto_justificativa',
    cluster_name: 'Familiares e psicoeducacao',
    cluster_description: 'Maes, pais, parceiros que querem entender e ajudar. Produto para quem convive.',
    keywords: ['mae', 'filho', 'familiar', 'parceira', 'esposa', 'convive', 'entender', 'psicoeducacao'] },
  { dimension: 'sinal_produto', parent_value: 'forte', signal_field: 'sinal_produto_justificativa',
    cluster_name: 'Consulta e acesso profissional',
    cluster_description: 'Demanda direta por consulta ou alternativa. Perguntam onde o Dr. Bruno atende.',
    keywords: ['onde atende', 'consulta', 'atendimento', 'profissional', 'servico'] },
  { dimension: 'sinal_produto', parent_value: 'forte', signal_field: 'sinal_produto_justificativa',
    cluster_name: 'Barreira financeira',
    cluster_description: 'Querem ajuda mas nao podem pagar. Pedem alternativa acessivel, citam SUS, CAPS.',
    keywords: ['financeira', 'dinheiro', 'pagar', 'CAPS', 'SUS', 'barreira', 'acessivel', 'gratuito'] },
  { dimension: 'sinal_produto', parent_value: 'forte', signal_field: 'sinal_produto_justificativa',
    cluster_name: 'Profissionais de alta performance',
    cluster_description: 'Advogados, medicos, TI, concurseiros. TDAH + alta capacidade + esgotamento.',
    keywords: ['advogado', 'profissional de alto desempenho', 'alto desempenho', 'concurso', 'doutorado'] },
  { dimension: 'sinal_produto', parent_value: 'forte', signal_field: 'sinal_produto_justificativa',
    cluster_name: 'Procrastinacao e paralisia cronica',
    cluster_description: 'Dor cronica com produtividade. Decadas sem conseguir executar.',
    keywords: ['procrastinac', 'paralisia', 'nao consegue terminar', 'nao rende', 'completar', 'executar', 'funcao executiva'] },
  { dimension: 'sinal_produto', parent_value: 'forte', signal_field: 'sinal_produto_justificativa',
    cluster_name: 'Dor emocional e ideacao suicida',
    cluster_description: 'Casos graves: depressao profunda, ideacao suicida, explosoes, isolamento extremo.',
    keywords: ['suicida', 'depressao', 'explosoes', 'extrema', 'desesper', 'isola'] },
  { dimension: 'sinal_produto', parent_value: 'forte', signal_field: 'sinal_produto_justificativa',
    cluster_name: 'Sono, rotina e organizacao',
    cluster_description: 'Problemas com sono, rotina impossivel, casa bagunçada, vida adulta basica.',
    keywords: ['sono', 'rotina', 'matinal', 'bagunca', 'organiz', 'dona de casa'] },
  { dimension: 'sinal_produto', parent_value: 'forte', signal_field: 'sinal_produto_justificativa',
    cluster_name: 'Tratamento que falhou',
    cluster_description: 'Ja tentaram remedios, terapia, psiquiatras — nada resolveu. Buscam abordagem diferente.',
    keywords: ['ja tentou', 'sem resultado', 'nao resolveu', 'nao adiantou', 'nao melhorou', 'sem melhora', 'remedio sem', 'incompetente', 'desistiu'] },
  { dimension: 'sinal_produto', parent_value: 'forte', signal_field: 'sinal_produto_justificativa',
    cluster_name: 'Busca explicita de direcao',
    cluster_description: 'Pedem ajuda diretamente: "o que faco?", "por onde comeco?", "preciso de ajuda".',
    keywords: ['busca direcao', 'busca explicita', 'pede ajuda', 'o que faco', 'por onde', 'direcao concreta', 'busca de solucao', 'pergunta direta'] },
  { dimension: 'sinal_produto', parent_value: 'forte', signal_field: 'sinal_produto_justificativa',
    cluster_name: 'Ferramentas e metodologia',
    cluster_description: 'Pedem apps, sistemas, cursos, guias praticos. Querem ferramenta, nao so informacao.',
    keywords: ['ferramenta', 'metodologia', 'app', 'curso', 'guia', 'programa', 'material', 'livro', 'mentoria', 'coaching', 'comunidade', 'grupo'] },
  { dimension: 'sinal_produto', parent_value: 'forte', signal_field: 'sinal_produto_justificativa',
    cluster_name: 'TDAH destruindo carreira',
    cluster_description: 'Impacto concreto no trabalho: demissoes, nao fixar informacoes, esquecimentos profissionais.',
    keywords: ['trabalho', 'carreira', 'emprego', 'demiss', 'cargo', 'empresa', 'corporat'] },
  { dimension: 'sinal_produto', parent_value: 'forte', signal_field: 'sinal_produto_justificativa',
    cluster_name: 'Relacionamentos destruidos',
    cluster_description: 'TDAH destruiu casamento, namoro, amizades. Busca produto para salvar ou reconstruir relacoes.',
    keywords: ['relacionamento', 'casamento', 'namoro', 'parceiro', 'conjuge', 'amoroso'] },
  { dimension: 'sinal_produto', parent_value: 'forte', signal_field: 'sinal_produto_justificativa',
    cluster_name: 'Dor cronica e urgencia',
    cluster_description: 'Sofrimento prolongado, urgencia emocional, multiplas areas impactadas. "Nao aguento mais".',
    keywords: ['dor cronica', 'urgente', 'intenso', 'prolongado', 'sofrimento cronico', 'perdeu esperanca', 'resignacao'] },

  // ======= COPY (634 forte) =======
  // Categorias por TIPO DE LINGUAGEM (como a IA classifica copy)
  { dimension: 'sinal_copy', parent_value: 'forte', signal_field: 'sinal_copy_justificativa',
    cluster_name: 'Headlines e hooks prontos',
    cluster_description: 'Frases que funcionam como titulo ou gancho sem edicao. Copy pronta pra usar.',
    keywords: ['headline', 'hook', 'funciona como', 'sem edicao', 'titulo', 'gancho'] },
  { dimension: 'sinal_copy', parent_value: 'forte', signal_field: 'sinal_copy_justificativa',
    cluster_name: 'Metaforas e imagens originais',
    cluster_description: 'Metaforas visuais e criativas que descrevem a experiencia TDAH de forma memoravel.',
    keywords: ['metafora', 'visual', 'original', 'imagem', 'analogia', 'memoravel', 'poetica'] },
  { dimension: 'sinal_copy', parent_value: 'forte', signal_field: 'sinal_copy_justificativa',
    cluster_name: 'Contrastes poderosos',
    cluster_description: 'Frases com contraste forte: antes/depois, saber/nao conseguir, inteligente/fracassado.',
    keywords: ['contraste', 'paradox', 'vs', 'antes e depois', 'saber e nao conseguir'] },
  { dimension: 'sinal_copy', parent_value: 'forte', signal_field: 'sinal_copy_justificativa',
    cluster_name: 'Frases concisas e emocionais',
    cluster_description: 'Frases curtas com carga emocional alta. Uma frase que resume anos de sofrimento.',
    keywords: ['concisa e emocional', 'concisa e universal', 'concisa com', 'curta e', 'frase concisa'] },
  { dimension: 'sinal_copy', parent_value: 'forte', signal_field: 'sinal_copy_justificativa',
    cluster_name: 'Narrativas de vida',
    cluster_description: 'Relatos longos com arco narrativo: inicio, meio, virada. Historias que prendem.',
    keywords: ['narrativa', 'relato', 'historia', 'arco', 'momento-chave', 'ponto critico'] },
  { dimension: 'sinal_copy', parent_value: 'forte', signal_field: 'sinal_copy_justificativa',
    cluster_name: 'Identificacao universal',
    cluster_description: '"Isso sou eu" — frases que qualquer pessoa com TDAH reconhece imediatamente.',
    keywords: ['universal', 'identificavel', 'reconhec', 'isso sou eu', 'identificacao', 'publico reconhec', 'isso e eu'] },
  { dimension: 'sinal_copy', parent_value: 'forte', signal_field: 'sinal_copy_justificativa',
    cluster_name: 'Dor emocional crua',
    cluster_description: 'Sofrimento visceral. Frases que doem ao ler. Copy de alta conversao emocional.',
    keywords: ['visceral', 'intensidad', 'vulnerabilidade', 'crua', 'emocional forte', 'poder emocional', 'profunda', 'potente', 'dor', 'desist', 'desespero'] },
  { dimension: 'sinal_copy', parent_value: 'forte', signal_field: 'sinal_copy_justificativa',
    cluster_name: 'Humor e auto-ironia',
    cluster_description: 'Frases engracadas e auto-ironicas. Leveza que gera identificacao e engajamento.',
    keywords: ['humor', 'ironi', 'engracad', 'piada', 'comico', 'leveza', 'divertid', 'hilaria', 'sarcastica'] },
  { dimension: 'sinal_copy', parent_value: 'forte', signal_field: 'sinal_copy_justificativa',
    cluster_name: 'Culpa, rotulos e estigma',
    cluster_description: 'Rotulos dolorosos (preguicoso, burro, estranho), culpa internalizada, estigma social.',
    keywords: ['culpa', 'rotulo', 'estigma', 'fracasso', 'autoestima', 'rejeicao', 'derrota', 'inadequ', 'mascaramento'] },
  { dimension: 'sinal_copy', parent_value: 'forte', signal_field: 'sinal_copy_justificativa',
    cluster_name: 'Prova social e autoridade',
    cluster_description: 'Elogios de profissionais, testimoniais de impacto, frases de autoridade.',
    keywords: ['prova social', 'autoridade', 'elogio', 'profissional de saude', 'renascimento', 'divisor de aguas'] },
  { dimension: 'sinal_copy', parent_value: 'forte', signal_field: 'sinal_copy_justificativa',
    cluster_name: 'Saudade e relacionamentos',
    cluster_description: 'Nao sentir saudade, indiferenca emocional, relacoes destruidas.',
    keywords: ['saudade', 'indiferenc', 'amar', 'frio', 'distante', 'relacion', 'casamento', 'parceiro'] },
  { dimension: 'sinal_copy', parent_value: 'forte', signal_field: 'sinal_copy_justificativa',
    cluster_name: 'Descoberta tardia e idade',
    cluster_description: 'Frases sobre diagnostico tardio, decadas perdidas, idosos descobrindo TDAH.',
    keywords: ['idade', 'idoso', 'terceira idade', 'anos carregando', '68 anos', '76 anos', 'tardio', 'vida inteira'] },
  { dimension: 'sinal_copy', parent_value: 'forte', signal_field: 'sinal_copy_justificativa',
    cluster_name: 'Trabalho e carreira',
    cluster_description: 'Frases sobre impacto no trabalho, procrastinacao profissional, burnout.',
    keywords: ['trabalho', 'carreira', 'profissional', 'concurso', 'corporativ', 'chefe'] },
];

async function main() {
  console.log('Refazendo clusters de sinais (v2 — somente justificativa, com Outros)...\n');

  const DIMENSIONS = ['sinal_conteudo', 'sinal_produto', 'sinal_copy'];

  for (const dim of DIMENSIONS) {
    console.log(`\n=== ${dim} ===`);

    // Delete old clusters for this dimension
    await sb.from('aud_subclusters').delete().eq('dimension', dim);

    // Fetch ALL comments with forte signal (paginated)
    const signalField = dim.replace('sinal_', 'sinal_') + '_justificativa';
    const all: any[] = [];
    let offset = 0;
    while (true) {
      const { data } = await sb.from('aud_comments')
        .select(`id, ${signalField}, peso_social, text`)
        .eq(dim, 'forte').eq('is_team', false).eq('is_channel_owner', false)
        .range(offset, offset + 999);
      if (!data || data.length === 0) break;
      all.push(...data);
      if (data.length < 1000) break;
      offset += 1000;
    }

    console.log(`  Total forte: ${all.length}`);

    // Get clusters for this dimension
    const dimClusters = CLUSTERS.filter(c => c.dimension === dim);
    const assigned = new Set<string>();

    for (const sc of dimClusters) {
      const matching = all.filter(c => {
        const just = ((c as any)[sc.signal_field] || '').toLowerCase();
        return sc.keywords.some(kw => just.includes(kw.toLowerCase()));
      });

      const ids = matching.map(c => c.id);
      ids.forEach(id => assigned.add(id));

      const quotes = matching
        .sort((a, b) => b.peso_social - a.peso_social)
        .slice(0, 3)
        .map(c => (c.text || '').slice(0, 200));

      await sb.from('aud_subclusters').insert({
        dimension: sc.dimension,
        parent_value: sc.parent_value,
        cluster_name: sc.cluster_name,
        cluster_description: sc.cluster_description,
        comment_ids: ids,
        example_quotes: quotes,
        count: ids.length,
      });

      console.log(`  ${ids.length.toString().padStart(4)} | ${sc.cluster_name}`);
    }

    // "Outros" — comments not in any cluster
    const others = all.filter(c => !assigned.has(c.id));
    if (others.length > 0) {
      const quotes = others
        .sort((a, b) => b.peso_social - a.peso_social)
        .slice(0, 3)
        .map(c => (c.text || '').slice(0, 200));

      await sb.from('aud_subclusters').insert({
        dimension: dim,
        parent_value: 'forte',
        cluster_name: 'Outros',
        cluster_description: 'Comentarios com sinal forte que nao se encaixam nos sub-clusters acima.',
        comment_ids: others.map(c => c.id),
        example_quotes: quotes,
        count: others.length,
      });

      console.log(`  ${others.length.toString().padStart(4)} | Outros`);
    }

    const classified = assigned.size;
    console.log(`  Cobertura: ${classified}/${all.length} (${Math.round(classified / all.length * 100)}%) + ${others.length} outros`);
  }

  console.log('\nDone.');
}

main().catch(console.error);
