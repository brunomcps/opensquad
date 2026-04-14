/**
 * insert-subclusters.ts — Insere sub-clusters analisados manualmente
 * Baseado na análise das 2.652 demandas por categoria
 */

import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.SUPABASE_URL || 'https://vdaualgktroizsttbrfh.supabase.co',
  process.env.SUPABASE_KEY || ''
);

interface Subcluster {
  dimension: string;
  parent_value: string;
  cluster_name: string;
  cluster_description: string;
  keywords: string[]; // used to match demandas
}

const SUBCLUSTERS: Subcluster[] = [
  // === DIAGNOSTICO (536) ===
  { dimension: 'demanda_categoria', parent_value: 'diagnostico', cluster_name: 'Busca por profissional ou avaliacao',
    cluster_description: 'Pessoas que querem saber onde ir, qual profissional procurar, como fazer teste. Demanda ativa por proximo passo.',
    keywords: ['busca por diagnostico', 'busca por atendimento', 'busca orientacao', 'profissional', 'avaliacao', 'como fazer teste', 'qual profissional', 'neuroavaliacao', 'proximo passo'] },
  { dimension: 'demanda_categoria', parent_value: 'diagnostico', cluster_name: 'Diagnostico tardio (40+)',
    cluster_description: 'Adultos 40-70+ que descobriram ou suspeitam de TDAH na maturidade. Sentem que "perderam a vida" sem saber.',
    keywords: ['tardio', '40 anos', '45 anos', '50 anos', '55 anos', '56 anos', '58 anos', '60 anos', '65 anos', '67 anos', '68 anos', '69 anos', '70 anos', '71 anos', 'terceira idade', 'idosa', 'maturidade'] },
  { dimension: 'demanda_categoria', parent_value: 'diagnostico', cluster_name: 'Suspeita sem acao — "sera que eu tenho?"',
    cluster_description: 'Se identificam com os sintomas mas nao tomaram nenhuma acao. Estao no limbo entre suspeita e diagnostico.',
    keywords: ['sera que', 'suspeita', 'desconfio', 'me identifiquei', 'nao tenho diagnostico', 'nao sei se', 'devo me preocupar'] },
  { dimension: 'demanda_categoria', parent_value: 'diagnostico', cluster_name: 'Barreira financeira',
    cluster_description: 'Querem diagnostico/tratamento mas nao conseguem pagar. Pedem alternativas acessiveis.',
    keywords: ['dinheiro', 'pagar', 'financeira', 'nao consigo pagar', 'nao tem condicao', 'cobram', 'caro', 'gratuita'] },
  { dimension: 'demanda_categoria', parent_value: 'diagnostico', cluster_name: 'Confusao diagnostica — TDAH vs outros',
    cluster_description: 'Duvida se e TDAH ou outro transtorno (borderline, bipolar, TEA, ansiedade). Diagnostico diferencial.',
    keywords: ['borderline', 'bipolar', 'autismo', 'TEA', 'ansiedade', 'toc', 'falso negativo', 'diagnostico diferencial', 'confusao'] },
  { dimension: 'demanda_categoria', parent_value: 'diagnostico', cluster_name: 'Perdido apos diagnostico',
    cluster_description: 'Ja recebeu diagnostico mas nao sabe o que fazer agora. Precisa de direcao pos-diagnostico.',
    keywords: ['apos diagnostico', 'descobri', 'o que fazer', 'perdida', 'recem diagnosticado', 'pos-diagnostico', 'proximo passo'] },
  { dimension: 'demanda_categoria', parent_value: 'diagnostico', cluster_name: 'Invalidacao por profissionais ou familia',
    cluster_description: 'Profissional descartou TDAH, familia nao acredita, ou foram maltratados por falta de diagnostico.',
    keywords: ['invalida', 'descarta', 'bobagem', 'ironicamente', 'nao acredita', 'maltratada', 'ignorada', 'taxado'] },

  // === PRODUTIVIDADE (307) ===
  { dimension: 'demanda_categoria', parent_value: 'produtividade', cluster_name: 'Procrastinacao e paralisia cronica',
    cluster_description: 'Procrastinacao que impede funcionar no dia a dia. Sabem o que precisam fazer mas nao conseguem.',
    keywords: ['procrastinacao', 'paralisia', 'nao consegue comecar', 'trava', 'posterga'] },
  { dimension: 'demanda_categoria', parent_value: 'produtividade', cluster_name: 'Projetos inacabados e abandono',
    cluster_description: 'Comecam cursos, projetos, hobbies com entusiasmo mas abandonam. Acumulam coisas incompletas.',
    keywords: ['inacabado', 'nao termina', 'abandona', 'cursos', 'comeca e nao', 'desiste', 'enjoa'] },
  { dimension: 'demanda_categoria', parent_value: 'produtividade', cluster_name: 'Foco e concentracao comprometidos',
    cluster_description: 'Nao conseguem manter atencao em tarefas. Distraem com qualquer coisa.',
    keywords: ['foco', 'concentracao', 'atencao', 'distrai', 'perde o fio'] },
  { dimension: 'demanda_categoria', parent_value: 'produtividade', cluster_name: 'Sofrimento no trabalho/estudo',
    cluster_description: 'TDAH impactando diretamente desempenho profissional ou academico. Risco de demissao ou reprovacao.',
    keywords: ['trabalho', 'estudo', 'emprego', 'faculdade', 'chefe', 'demissao', 'reprovacao', 'desempenho'] },
  { dimension: 'demanda_categoria', parent_value: 'produtividade', cluster_name: 'Busca por sistemas e ferramentas praticas',
    cluster_description: 'Querem solucoes concretas — rotinas, checklists, metodos. Nao querem mais explicacao, querem acao.',
    keywords: ['sistema', 'ferramenta', 'rotina', 'checklist', 'metodo', 'acoes concretas', 'o que fazer', 'como melhorar'] },

  // === REGULACAO_EMOCIONAL (217) ===
  { dimension: 'demanda_categoria', parent_value: 'regulacao_emocional', cluster_name: 'Explosoes emocionais (raiva, choro)',
    cluster_description: 'Reacoes desproporcionais — vao de 0 a 100, explodem com familia, choram sem motivo aparente.',
    keywords: ['raiva', 'explode', 'choro', 'desproporcion', '0 a 100', 'reacao'] },
  { dimension: 'demanda_categoria', parent_value: 'regulacao_emocional', cluster_name: 'Exaustao emocional cronica',
    cluster_description: 'Cansaco que nao e fisico — e emocional. Esgotamento de lutar contra o TDAH todos os dias.',
    keywords: ['exaustao', 'cansaco', 'esgotamento', 'fadiga', 'energia', 'burnout'] },
  { dimension: 'demanda_categoria', parent_value: 'regulacao_emocional', cluster_name: 'Culpa e vergonha constantes',
    cluster_description: 'Se culpam por nao conseguir ser "normais". Vergonha dos comportamentos que nao controlam.',
    keywords: ['culpa', 'vergonha', 'se culpa', 'incapaz'] },
  { dimension: 'demanda_categoria', parent_value: 'regulacao_emocional', cluster_name: 'Disforia de rejeicao',
    cluster_description: 'Hipersensibilidade a criticas e rejeicao. Uma palavra mal colocada arruina o dia.',
    keywords: ['rejeicao', 'disforia', 'critica', 'sensibilidade', 'vulnerabilidade'] },
  { dimension: 'demanda_categoria', parent_value: 'regulacao_emocional', cluster_name: 'Compulsao e impulsividade',
    cluster_description: 'Compras compulsivas, comer emocional, decisoes impulsivas. Busca de dopamina.',
    keywords: ['compra', 'compulsiv', 'impulsi', 'dopamina', 'comer'] },

  // === RELACIONAMENTOS (229) ===
  { dimension: 'demanda_categoria', parent_value: 'relacionamentos', cluster_name: 'Conflito conjugal por TDAH',
    cluster_description: 'Casamento/namoro sendo destruido pelo TDAH. Parceiro nao entende, brigas constantes.',
    keywords: ['conjugal', 'casamento', 'namoro', 'parceiro', 'marido', 'esposa', 'namorad'] },
  { dimension: 'demanda_categoria', parent_value: 'relacionamentos', cluster_name: 'Isolamento social e solidao',
    cluster_description: 'Se afastam das pessoas, nao mantem amizades, preferem ficar sozinhos. Solidao cronica.',
    keywords: ['isolamento', 'sozinho', 'solidao', 'se afasta', 'nao mant'] },
  { dimension: 'demanda_categoria', parent_value: 'relacionamentos', cluster_name: 'Conflito familiar (pais, filhos, irmaos)',
    cluster_description: 'Familia nao entende, cobra, critica. Relacao com pais/filhos deteriorada pelo TDAH.',
    keywords: ['familia', 'pai', 'mae', 'filho', 'irmao', 'cobranca', 'familiar'] },
  { dimension: 'demanda_categoria', parent_value: 'relacionamentos', cluster_name: 'Indiferenca emocional e falta de saudade',
    cluster_description: 'Nao sentem saudade, parecem frios, parceiros se magoam. Culpa por nao sentir o que "deveria".',
    keywords: ['saudade', 'indiferenc', 'frio', 'nao sente', 'enjoa'] },
  { dimension: 'demanda_categoria', parent_value: 'relacionamentos', cluster_name: 'Perda de relacionamentos pelo TDAH',
    cluster_description: 'Ja perderam casamentos, amizades, oportunidades por causa do TDAH. Luto relacional.',
    keywords: ['perdi', 'perdeu', 'divorc', 'separac', 'destrui', 'acabou'] },

  // === AUTOESTIMA_IDENTIDADE (215) ===
  { dimension: 'demanda_categoria', parent_value: 'autoestima_identidade', cluster_name: 'Sentimento de ser defeituoso',
    cluster_description: 'Acreditam que ha algo fundamentalmente errado com eles. Se veem como "fracassados" ou "estranhos".',
    keywords: ['defeituoso', 'fracasso', 'estranho', 'inadequa', 'diferente', 'errado comigo'] },
  { dimension: 'demanda_categoria', parent_value: 'autoestima_identidade', cluster_name: 'Culpa cronica autoimposta',
    cluster_description: 'Se culpam por preguica, desorganizacao, esquecimentos. Internalizaram as criticas dos outros.',
    keywords: ['culpa', 'preguica', 'preguicoso', 'se culpa', 'me cobro'] },
  { dimension: 'demanda_categoria', parent_value: 'autoestima_identidade', cluster_name: 'Luto da vida perdida',
    cluster_description: 'Olham pra tras e veem decadas de potencial desperdicado. "Tive tudo pra ser rico e deixei passar."',
    keywords: ['vida perdida', 'joguei', 'desperdicou', 'poderia ter', 'se tivesse', 'tive tudo'] },
  { dimension: 'demanda_categoria', parent_value: 'autoestima_identidade', cluster_name: 'Nao pertencimento e isolamento identitario',
    cluster_description: 'Nunca se encaixaram em lugar nenhum. Sentem que nao pertencem a nenhum grupo.',
    keywords: ['pertencimento', 'nao me encaixo', 'diferente', 'nao pertenco', 'sozinho'] },

  // === MEDICACAO_TRATAMENTO (207) ===
  { dimension: 'demanda_categoria', parent_value: 'medicacao_tratamento', cluster_name: 'Duvida sobre qual medicacao tomar',
    cluster_description: 'Querem saber qual remedio funciona, efeitos colaterais, se Ritalina/Venvanse e seguro.',
    keywords: ['medicacao', 'remedio', 'ritalina', 'venvanse', 'lisdexanf', 'efeito colateral', 'segur'] },
  { dimension: 'demanda_categoria', parent_value: 'medicacao_tratamento', cluster_name: 'Como tratar sem saber por onde comecar',
    cluster_description: 'Sabem que precisam de ajuda mas nao sabem o primeiro passo. "O que eu faco?"',
    keywords: ['como tratar', 'o que fazer', 'por onde comecar', 'proximo passo', 'como lidar'] },
  { dimension: 'demanda_categoria', parent_value: 'medicacao_tratamento', cluster_name: 'Barreira financeira para tratamento',
    cluster_description: 'Nao conseguem pagar consulta, medicacao ou acompanhamento. Pedem alternativas acessiveis.',
    keywords: ['financeira', 'dinheiro', 'pagar', 'caro', 'nao consigo', 'acessivel', 'gratuito'] },
  { dimension: 'demanda_categoria', parent_value: 'medicacao_tratamento', cluster_name: 'Insatisfacao com tratamento atual',
    cluster_description: 'Estao em tratamento mas nao funciona. Medicacao nao faz efeito, terapeuta nao entende TDAH.',
    keywords: ['insatisfacao', 'nao funciona', 'nao faz efeito', 'trocar', 'nao resolve'] },

  // === COMORBIDADES (188) ===
  { dimension: 'demanda_categoria', parent_value: 'comorbidades', cluster_name: 'TDAH + Ansiedade',
    cluster_description: 'Ansiedade como comorbidade principal. Nao sabem o que e TDAH e o que e ansiedade.',
    keywords: ['ansiedade', 'ansiedad'] },
  { dimension: 'demanda_categoria', parent_value: 'comorbidades', cluster_name: 'TDAH + Depressao',
    cluster_description: 'Depressao que pode ser consequencia do TDAH nao tratado. Ciclo de fracasso → depressao.',
    keywords: ['depressao', 'depressiv'] },
  { dimension: 'demanda_categoria', parent_value: 'comorbidades', cluster_name: 'TDAH + TEA (Autismo)',
    cluster_description: 'Duplo diagnostico TDAH + TEA. Masking, confusao diagnostica, necessidades especificas.',
    keywords: ['TEA', 'autismo', 'autista', 'espectro'] },
  { dimension: 'demanda_categoria', parent_value: 'comorbidades', cluster_name: 'Multiplas comorbidades',
    cluster_description: 'TDAH + 2 ou mais condicoes (ansiedade + depressao + TOC, etc). Complexidade do tratamento.',
    keywords: ['toc', 'bipolar', 'borderline', 'multiplas', 'varias', 'comorbidade'] },

  // === PSICOEDUCACAO_TERCEIROS (160) ===
  { dimension: 'demanda_categoria', parent_value: 'psicoeducacao_terceiros', cluster_name: 'Maes e pais querendo entender o filho',
    cluster_description: 'Pais que assistem o canal pra entender o filho com TDAH. Querem saber como ajudar.',
    keywords: ['mae', 'pai', 'filho', 'filha', 'neto', 'avo', 'meu filho', 'minha filha'] },
  { dimension: 'demanda_categoria', parent_value: 'psicoeducacao_terceiros', cluster_name: 'Parceiro querendo entender o conjuge',
    cluster_description: 'Marido/esposa/namorado(a) assistindo pra entender a pessoa com TDAH.',
    keywords: ['parceiro', 'marido', 'esposa', 'namorad', 'conjuge', 'companheiro'] },
  { dimension: 'demanda_categoria', parent_value: 'psicoeducacao_terceiros', cluster_name: 'Ninguem ao redor entende',
    cluster_description: 'Pessoas com TDAH que sofrem porque ninguem na vida delas compreende a condicao.',
    keywords: ['ninguem entende', 'nao entend', 'invalidacao', 'nao acredit', 'descredito'] },

  // === CARREIRA (138) ===
  { dimension: 'demanda_categoria', parent_value: 'carreira', cluster_name: 'TDAH destruindo carreira ativa',
    cluster_description: 'Problemas no emprego atual — prazos, erros, conflitos com chefe. Risco de demissao.',
    keywords: ['emprego', 'chefe', 'demissao', 'prazos', 'erros', 'desempenho', 'pressao'] },
  { dimension: 'demanda_categoria', parent_value: 'carreira', cluster_name: 'Instabilidade profissional cronica',
    cluster_description: 'Trocam de emprego/carreira constantemente. Nao conseguem se firmar em nada.',
    keywords: ['instabilidade', 'troca', 'nao se firma', 'multiplas', 'varias faculdade'] },
  { dimension: 'demanda_categoria', parent_value: 'carreira', cluster_name: 'Qual carreira funciona com TDAH',
    cluster_description: 'Querem saber qual profissao se encaixa no cerebro TDAH. Buscam direcao vocacional.',
    keywords: ['qual carreira', 'qual trabalho', 'tipo de trabalho', 'profissao', 'vocacional'] },
  { dimension: 'demanda_categoria', parent_value: 'carreira', cluster_name: 'Empreendedorismo e TDAH',
    cluster_description: 'Empreendedores com TDAH — hiperfoco ajuda mas desorganizacao sabota. Falencia, sobrecarga.',
    keywords: ['empreendedor', 'empresa', 'negocio', 'autonomo'] },

  // === FEEDBACK_PRODUCAO (140) ===
  { dimension: 'demanda_categoria', parent_value: 'feedback_producao', cluster_name: 'Musica de fundo atrapalha',
    cluster_description: 'Reclamacao recorrente: musica de fundo dos videos atrapalha a concentracao (ironicamente, em videos sobre TDAH).',
    keywords: ['musica', 'som', 'fundo', 'background'] },
  { dimension: 'demanda_categoria', parent_value: 'feedback_producao', cluster_name: 'Sugestoes de temas',
    cluster_description: 'Pedidos explicitos de temas para novos videos.',
    keywords: ['video sobre', 'faz um video', 'sugiro', 'sugere', 'tema', 'conteudo sobre'] },
  { dimension: 'demanda_categoria', parent_value: 'feedback_producao', cluster_name: 'Elogios ao formato/conteudo',
    cluster_description: 'Feedback positivo sobre clareza, didatica, profundidade do conteudo.',
    keywords: ['elogio', 'otimo', 'excelente', 'didatica', 'clareza', 'melhor canal'] },

  // === SONO_ROTINA (129) ===
  { dimension: 'demanda_categoria', parent_value: 'sono_rotina', cluster_name: 'Insonia e dificuldade para dormir',
    cluster_description: 'Cerebro nao desliga a noite. Pensamentos acelerados, scrolling infinito, dorme as 3h.',
    keywords: ['insonia', 'dormir', 'nao desliga', 'pensamentos', 'noite', 'cerebro'] },
  { dimension: 'demanda_categoria', parent_value: 'sono_rotina', cluster_name: 'Exaustao matinal cronica',
    cluster_description: 'Acordam destruidos mesmo dormindo. Manha e um inferno. Rotina matinal impossivel.',
    keywords: ['acordar', 'manha', 'matinal', 'levantar', 'despertar', 'exaustao'] },
  { dimension: 'demanda_categoria', parent_value: 'sono_rotina', cluster_name: 'Incapacidade de manter rotina',
    cluster_description: 'Conseguem seguir rotina por 3 dias e depois abandonam. Falta de consistencia cronica.',
    keywords: ['rotina', 'consistencia', 'manter', 'abandonam', 'disciplina'] },

  // === ORGANIZACAO (110) ===
  { dimension: 'demanda_categoria', parent_value: 'organizacao', cluster_name: 'Esquecimentos e perda de objetos',
    cluster_description: 'Perdem chaves, celular, carteira diariamente. Esquecem compromissos, nomes, conversas.',
    keywords: ['esquec', 'perde', 'perda', 'memoria', 'objetos', 'chave', 'celular'] },
  { dimension: 'demanda_categoria', parent_value: 'organizacao', cluster_name: 'Acumulacao e bagunca cronica',
    cluster_description: 'Casa sempre bagunçada, acumulam objetos, nao conseguem descartar. Vergonha de receber visitas.',
    keywords: ['acumula', 'bagunca', 'desorganiz', 'descartar', 'limpar', 'casa'] },
  { dimension: 'demanda_categoria', parent_value: 'organizacao', cluster_name: 'Paralisia em tarefas administrativas',
    cluster_description: 'Contas, boletos, emails, burocracias — tudo acumula. Nao conseguem lidar com o "adulting".',
    keywords: ['contas', 'boletos', 'burocracia', 'admin', 'financ', 'adulting'] },
];

async function main() {
  console.log('Inserindo sub-clusters...\n');

  // Clear existing subclusters
  await sb.from('aud_subclusters').delete().eq('dimension', 'demanda_categoria');

  // For each subcluster, find matching demandas and get comment IDs + quotes
  for (const sc of SUBCLUSTERS) {
    // Find demandas that match keywords
    const { data: demandas } = await sb.from('aud_demandas')
      .select('comment_id, descricao')
      .eq('categoria', sc.parent_value);

    const matchingCommentIds: string[] = [];
    const matchingDescs: string[] = [];

    for (const d of demandas || []) {
      const desc = (d.descricao || '').toLowerCase();
      if (sc.keywords.some(kw => desc.includes(kw.toLowerCase()))) {
        if (!matchingCommentIds.includes(d.comment_id)) {
          matchingCommentIds.push(d.comment_id);
          matchingDescs.push(d.descricao || '');
        }
      }
    }

    // Get example quotes from matching comments (top 3 by peso_social)
    let exampleQuotes: string[] = [];
    if (matchingCommentIds.length > 0) {
      const { data: comments } = await sb.from('aud_comments')
        .select('text, peso_social')
        .in('id', matchingCommentIds.slice(0, 50))
        .order('peso_social', { ascending: false })
        .limit(3);
      exampleQuotes = (comments || []).map(c => (c.text || '').slice(0, 200));
    }

    const row = {
      dimension: sc.dimension,
      parent_value: sc.parent_value,
      cluster_name: sc.cluster_name,
      cluster_description: sc.cluster_description,
      comment_ids: matchingCommentIds,
      example_quotes: exampleQuotes,
      count: matchingCommentIds.length,
    };

    const { error } = await sb.from('aud_subclusters').insert(row);
    if (error) console.error(`Error: ${sc.cluster_name}: ${error.message}`);
    else console.log(`  ${sc.parent_value} → ${sc.cluster_name}: ${matchingCommentIds.length} comentarios`);
  }

  // Verify
  const { count } = await sb.from('aud_subclusters').select('*', { count: 'exact', head: true });
  console.log(`\nTotal sub-clusters: ${count}`);
}

main().catch(console.error);
