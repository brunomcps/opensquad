/**
 * insert-segment-subclusters.ts — Sub-segmentos para cada segmento de jornada
 * Busca APENAS na justificativa + texto, com "Outros" para o que sobrar
 */
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.SUPABASE_URL || 'https://vdaualgktroizsttbrfh.supabase.co',
  process.env.SUPABASE_KEY || ''
);

interface SubSegDef {
  segmentId: string;
  emoji: string;
  name: string;
  description: string;
  keywords: string[]; // searched in text + demanda descriptions
}

const SUB_SEGMENTS: SubSegDef[] = [
  // === CONFIRMADO MAS PERDIDO (591) ===
  { segmentId: 'confirmado_perdido', emoji: '\u{1F494}', name: 'Relacionamentos destruidos',
    description: 'Casamentos acabaram, amizades perdidas, nao sente saudade. Sabe que e TDAH mas os estragos ja foram feitos.',
    keywords: ['casamento', 'namoro', 'separac', 'divorc', 'parceiro', 'esposa', 'marido', 'relacionamento', 'amor', 'saudade', 'namorad'] },
  { segmentId: 'confirmado_perdido', emoji: '\u{1F9E9}', name: 'Comorbidades complicam tudo',
    description: 'TDAH + autismo/bipolar/depressao/burnout. Diagnosticado mas o combo torna tudo mais dificil.',
    keywords: ['autismo', 'TEA', 'bipolar', 'depressao', 'burnout', 'comorbid', 'TOC', 'ansiedade generalizada'] },
  { segmentId: 'confirmado_perdido', emoji: '\u{1F614}', name: 'Autoestima destruida',
    description: 'Culpa, vergonha, se sente defeituoso. Sabe que e TDAH mas internalizou as criticas.',
    keywords: ['culpa', 'preguica', 'fracasso', 'defeituos', 'vergonha', 'inadequa', 'estranho', 'monstro', 'lixo', 'inutil'] },
  { segmentId: 'confirmado_perdido', emoji: '\u{1F4BC}', name: 'Carreira em colapso',
    description: 'Prazos, demissoes, faculdades trancadas. TDAH destruindo vida profissional.',
    keywords: ['emprego', 'demissao', 'carreira', 'trabalho', 'prazos', 'faculdade', 'trancou', 'chefe', 'concurso'] },
  { segmentId: 'confirmado_perdido', emoji: '\u{231B}', name: 'Luto do diagnostico tardio',
    description: 'Descobriu tarde (40+), olha pra tras e ve decadas perdidas. "Joguei minha vida fora."',
    keywords: ['vida inteira', 'desperdicou', 'anos sem saber', 'joguei', 'poderia ter', 'agora aos', 'tarde demais', 'diagnostico tardio', 'vida passou', 'descobri', 'fui diagnosticad', 'agora entend', 'agora sei'] },
  { segmentId: 'confirmado_perdido', emoji: '\u{1F62D}', name: 'Validacao e catarse',
    description: 'Usa o canal pra se validar — "me descreveu", "chorei assistindo". Nao esta buscando acao.',
    keywords: ['me descreveu', 'chorei', 'chorando', 'lagrima', 'me identifiquei', 'parece que me conhec', 'minha historia'] },
  { segmentId: 'confirmado_perdido', emoji: '\u{1F9E0}', name: 'Sintomas no dia a dia',
    description: 'Relatos de como TDAH afeta a rotina: esquecimentos, procrastinacao, hiperfoco, desorganizacao.',
    keywords: ['esquec', 'procrastin', 'hiper foco', 'hiperfoco', 'desorganiz', 'bagunca', 'atraso', 'insonia', 'nao consigo dormir', 'acumul', 'foco', 'concentr', 'memoria', 'peneira'] },
  { segmentId: 'confirmado_perdido', emoji: '\u{1F64F}', name: 'Gratidao e reconhecimento',
    description: 'Confirmados que agradecem o canal por finalmente explicar o que sentem.',
    keywords: ['obrigad', 'gratidao', 'parabens', 'conteudo', 'canal', 'melhor canal', 'didatica', 'clareza', 'excelente', 'precisao'] },
  { segmentId: 'confirmado_perdido', emoji: '\u{2753}', name: 'Perguntas e pedidos de ajuda',
    description: 'Ja sabem que tem TDAH mas pedem orientacao: como tratar, o que fazer, pra onde ir.',
    keywords: ['como faz', 'como trat', 'existe', 'tem algum', 'pode ajudar', 'o que fazer', 'alguma dica', 'ajuda', 'gostaria de saber', 'sera que'] },
  { segmentId: 'confirmado_perdido', emoji: '\u{1F3AD}', name: 'Regulacao emocional e mascaramento',
    description: 'Montanha-russa emocional, mascarar sentimentos, gastar energia fingindo normalidade.',
    keywords: ['emocional', 'emocio', 'montanha-russa', 'mascarar', 'fingir', 'escond', 'explod', 'raiva', 'choro', 'nao consigo sentir', 'intenso'] },
  { segmentId: 'confirmado_perdido', emoji: '\u{1F91D}', name: 'Impacto nos outros',
    description: 'Como o TDAH afeta quem esta ao redor: familia, amigos, colegas. A culpa de prejudicar.',
    keywords: ['meu filho', 'minha filha', 'familia', 'ao redor', 'irmaos', 'compartilhei', 'ninguem entend', 'julgam', 'piada'] },
  { segmentId: 'confirmado_perdido', emoji: '\u{1FA9E}', name: 'Se reconhecendo no conteudo',
    description: 'Confirmados que assistem e se reconhecem: "me vi em todos", "definiu minha vida", "e eu".',
    keywords: ['me vi em', 'me descreveu', 'definiu', 'tudo que vc', 'minha vida', 'me identif', 'todinha', 'igualzinho', 'exatamente'] },

  // === DESCOBERTA (288) ===
  { segmentId: 'descoberta', emoji: '\u{1F914}', name: 'Se identificou com os sintomas',
    description: 'Reconhece os sintomas em si. "Tenho tudo isso", "me identifiquei", "todos os sinais".',
    keywords: ['me identifiquei', 'esse sou eu', 'tudo isso', 'igualzinho', 'nossa eu tenho', 'eu sou assim', 'tenho todos', 'todos os sintomas', 'todos os sinais', 'todos esses', 'me vi em', 'eu tenho', 'me descreveu', 'todinha', 'sou eu', 'me identifico', 'faz sentido'] },
  { segmentId: 'descoberta', emoji: '\u{1F4A1}', name: 'Concluindo que tem TDAH',
    description: '"Acho que tenho", "devo ter isso", "com certeza sou TDAH" — o momento da conclusao pessoal.',
    keywords: ['acho que tenho', 'devo ter', 'com certeza', 'tenho TDAH', 'tenho TDH', 'acabo de descobrir', 'acabei de descobrir', 'devo me preocupar', 'sera que eu tenho'] },
  { segmentId: 'descoberta', emoji: '\u{1F631}', name: 'Chocado com a revelacao',
    description: '"Meu Deus, nao acredito." Momento de epifania.',
    keywords: ['chocad', 'impressionad', 'nao acredito', 'meu deus', 'nossa senhora', 'caramba', 'incrivel', 'passado', 'assustador', 'arrepio'] },
  { segmentId: 'descoberta', emoji: '\u{1F62D}', name: 'Reacao emocional ao video',
    description: 'Chorou, emocionou, no na garganta. O impacto emocional do reconhecimento.',
    keywords: ['chorei', 'chorando', 'lagrima', 'emocion', 'garganta', 'lacrimej', 'arrepi', 'emociona'] },
  { segmentId: 'descoberta', emoji: '\u{1F46A}', name: 'Familia reconhecendo',
    description: 'Mae, pai, esposa assistindo e reconhecendo TDAH no familiar.',
    keywords: ['meu filho', 'minha filha', 'meu marido', 'minha esposa', 'meu neto', 'minha mae', 'meu pai', 'minha irma', 'minha neta', 'meu irmao'] },
  { segmentId: 'descoberta', emoji: '\u{1F62A}', name: 'Sofrimento cronico',
    description: 'Se identifica e revela anos de sofrimento que agora faz sentido.',
    keywords: ['sofr', 'cansad', 'exaust', 'dificil toda', 'triste', 'dificuldade', 'luta', 'culpa', 'vergonha'] },
  { segmentId: 'descoberta', emoji: '\u{1F9D3}', name: 'Descoberta tardia (40+)',
    description: 'Pessoas mais velhas que so agora aos 40, 50, 60+ percebem que podem ter TDAH.',
    keywords: ['51 anos', '52 anos', '53 anos', '54 anos', '55 anos', '56 anos', '57 anos', '58 anos', '59 anos', '60 anos', '61 anos', '62 anos', '65 anos', '67 anos', '68 anos', '70 anos', '77 anos', '45 anos', '46 anos', '47 anos', '48 anos', '49 anos', '50 anos', '40 anos', '41 anos', '42 anos', '43 anos', '44 anos', 'menopausa', 'aposentad'] },
  { segmentId: 'descoberta', emoji: '\u{1F64F}', name: 'Gratidao pelo conteudo',
    description: 'Agradecem o video por ajudar a entender o que sempre sentiram.',
    keywords: ['obrigad', 'gratidao', 'parabens', 'inscrit', 'melhor canal', 'conteudo', 'bom video', 'otimo video', 'excelente'] },
  { segmentId: 'descoberta', emoji: '\u{1F50D}', name: 'Vai buscar diagnostico',
    description: 'Se identificou e ja quer procurar um profissional.',
    keywords: ['procurar', 'profissional', 'psiquiatra', 'psicologo', 'neurologista', 'diagnostico', 'consulta', 'avaliac', 'vou marcar', 'vou procurar'] },
  { segmentId: 'descoberta', emoji: '\u{1F9E0}', name: 'Relatos de sintomas especificos',
    description: 'Descreve sintomas concretos: esquecimentos, foco, saudade, procrastinacao — sem necessariamente dizer "me identifiquei".',
    keywords: ['esquec', 'memoria', 'foco', 'concentr', 'procrastin', 'organiz', 'atraso', 'insonia', 'hiperfoco', 'impulsiv', 'nao consigo', 'nao lembro', 'peneira'] },

  // === BUSCA ATIVA (226) ===
  { segmentId: 'busca_ativa', emoji: '\u{1F50D}', name: 'Quer diagnostico/profissional',
    description: 'Sabe que precisa de ajuda e quer saber pra onde ir.',
    keywords: ['profissional', 'diagnostico', 'consulta', 'psicologo', 'psiquiatra', 'neurologista', 'laudo', 'avaliacao', 'medico', 'tratamento', 'tratar'] },
  { segmentId: 'busca_ativa', emoji: '\u{1F4BC}', name: 'Sofrendo no trabalho/estudo',
    description: 'O gatilho e profissional — perdendo emprego ou falhando na faculdade.',
    keywords: ['trabalho', 'emprego', 'estud', 'faculdade', 'concurso', 'escola', 'chefe', 'demiss', 'empresa', 'carreira', 'curso'] },
  { segmentId: 'busca_ativa', emoji: '\u{1F198}', name: 'Desespero e urgencia',
    description: '"Preciso de ajuda", "nao aguento mais". Urgencia emocional.',
    keywords: ['ajuda', 'socorro', 'preciso', 'urgente', 'nao aguento', 'nao consigo mais', 'desespero', 'o que fazer', 'o que devo', 'como posso'] },
  { segmentId: 'busca_ativa', emoji: '\u{1F4B8}', name: 'Barreira financeira',
    description: 'Quer ajuda mas nao pode pagar consulta/tratamento.',
    keywords: ['dinheiro', 'pagar', 'caro', 'financ', 'SUS', 'CAPS', 'gratis'] },
  { segmentId: 'busca_ativa', emoji: '\u{1F9E0}', name: 'Multiplos sintomas acumulados',
    description: 'Lista varios sintomas de uma vez: esquecimento + procrastinacao + hiperfoco + exaustao. O combo completo.',
    keywords: ['todos os sintomas', 'todos esses', 'tudo isso', 'me identifiquei com todos', 'todos os sinais', 'tenho todos'] },
  { segmentId: 'busca_ativa', emoji: '\u{1F62E}\u{200D}\u{1F4A8}', name: 'Exaustao e paralisia cronica',
    description: 'Cansaco extremo, nao conseguir funcionar, paralisia que impede a vida basica.',
    keywords: ['exaust', 'cansac', 'cansad', 'paralisia', 'nao consigo', 'nao termino', 'nao execut', 'nao faco nada', 'parado'] },
  { segmentId: 'busca_ativa', emoji: '\u{1F6AB}', name: 'Ninguem entende ou acredita',
    description: 'Frustrados porque ninguem valida o que sentem. Medicos dizem que e ansiedade, familia nao acredita.',
    keywords: ['ninguem entend', 'ninguem acredit', 'dizem que e ansiedade', 'nao leva a serio', 'julga', 'chamada de', 'chamado de', 'avuada', 'preguicos'] },

  // === EM TRATAMENTO (386) ===
  { segmentId: 'em_tratamento', emoji: '\u{1F48A}', name: 'Medicacao nao resolve tudo',
    description: 'Em tratamento medicamentoso mas ainda sofre. Frustracao com limites da medicacao.',
    keywords: ['ritalina', 'venvanse', 'medicacao', 'remedio', 'tomo', 'receita', 'efeito colateral', 'nao resolve', 'atenttah', 'atomoxetina'] },
  { segmentId: 'em_tratamento', emoji: '\u{1F4AA}', name: 'Buscando estrategias complementares',
    description: 'Ja trata mas quer mais: exercicio, rotina, organizacao, metodos.',
    keywords: ['estrategia', 'rotina', 'exercicio', 'organiz', 'metodo', 'sistema', 'habito'] },
  { segmentId: 'em_tratamento', emoji: '\u{1F62E}\u{200D}\u{1F4A8}', name: 'Frustracao persistente apesar do tratamento',
    description: 'Faz terapia, toma remedio, mas o sofrimento continua. Questiona se vai melhorar.',
    keywords: ['frustr', 'cansad', 'exaust', 'nao melhora', 'ainda sofr', 'continua', 'dificil', 'horrivel', 'terrivel'] },
  { segmentId: 'em_tratamento', emoji: '\u{1F91D}', name: 'Compartilhando o que funciona',
    description: 'Ja encontrou caminhos e compartilha com outros. Dicas praticas entre usuarios.',
    keywords: ['recomendo', 'aconselho', 'uma dica', 'minha dica', 'faca terapia', 'comigo funciona', 'pra mim funciona', 'me ajudou foi', 'o que me ajuda', 'eu indico', 'sugiro'] },
  { segmentId: 'em_tratamento', emoji: '\u{231B}', name: 'Diagnostico tardio e luto',
    description: 'Descobriram TDAH tarde (40+), sentem luto pelas decadas perdidas.',
    keywords: ['descobri', 'diagnosticad', 'fui diagnosticad', 'agora sei', 'agora entend', 'anos e', 'aos 4', 'aos 5', 'aos 6', 'aos 7', 'aos 8', 'luto', 'alivio'] },
  { segmentId: 'em_tratamento', emoji: '\u{1F64F}', name: 'Gratidao pelo canal',
    description: 'Agradecem o Dr. Bruno por explicar o que sentem e dar esperanca.',
    keywords: ['obrigad', 'gratidao', 'parabens', 'abencoad', 'gratidao', 'canal', 'conteudo', 'seus videos'] },
  { segmentId: 'em_tratamento', emoji: '\u{1F4B8}', name: 'Remedios caros e acesso dificil',
    description: 'Medicacao cara, SUS nao oferece, dificuldade de acesso no interior.',
    keywords: ['caro', 'preco', 'pagar', 'SUS', 'CAPS', 'interior', 'impossivel'] },
  { segmentId: 'em_tratamento', emoji: '\u{274C}', name: 'Profissional errou ou negligenciou',
    description: 'Psiquiatras que nao escutam, diagnostico errado (bipolar, TAG, depressao), negligencia medica.',
    keywords: ['psiquiatra', 'negligenci', 'nao escuta', 'diagnostico errado', 'disseram que', 'bipolar', 'TAG', 'nao levou a serio', 'nao era com ele', 'nao se importa'] },
  { segmentId: 'em_tratamento', emoji: '\u{2728}', name: 'Tratamento transformou minha vida',
    description: 'Relatos positivos: o remedio mudou tudo, finalmente funciona, luz no fim do tunel.',
    keywords: ['mudou', 'transfor', 'da agua pro vinho', 'luz', 'feliz', 'realizada', 'calma', 'confiante', 'encontrei'] },
  { segmentId: 'em_tratamento', emoji: '\u{1F500}', name: 'Diagnostico errado por anos',
    description: 'Trataram como depressao, bipolar ou ansiedade por anos ate descobrir que era TDAH.',
    keywords: ['anos tratando', 'anos para', 'depressao', 'tratada como', 'tratado como', 'nunca iria melhorar', 'nao era depressao'] },
  { segmentId: 'em_tratamento', emoji: '\u{1FA9E}', name: 'Se reconhecendo mesmo em tratamento',
    description: 'Ja se tratam mas ainda se emocionam ao ver conteudo que os descreve com precisao.',
    keywords: ['me identif', 'me reconhec', 'me descreveu', 'todos os sintomas', 'todos os sinais', 'chorei', 'emocion', 'lagrim'] },

  // === SUPERFA ENGAJADO ===
  { segmentId: 'superfa_engajado', emoji: '\u{1F31F}', name: 'Elogios e gratidao',
    description: 'Superfas que elogiam o canal e expressam gratidao pelo conteudo.',
    keywords: ['obrigad', 'gratidao', 'excelente', 'melhor canal', 'parabens', 'incrivel', 'maravilhos', 'inscrit', 'membro', 'sensacional', 'otimo', 'fantastico', 'amei', 'amo seu', 'amo o canal', 'conteudo top', 'didatica'] },
  { segmentId: 'superfa_engajado', emoji: '\u{1F4AC}', name: 'Engajamento ativo (dicas e debates)',
    description: 'Superfas que comentam com dicas, experiencias, metodos testados.',
    keywords: ['funciona', 'testei', 'minha experiencia', 'recomendo', 'dica', 'metodo', 'sistema'] },
  { segmentId: 'superfa_engajado', emoji: '\u{1F614}', name: 'Superfas com dor ativa',
    description: 'Apesar de engajados, ainda sofrem e desabafam frequentemente.',
    keywords: ['sofr', 'dificil', 'triste', 'cansad', 'nao consigo', 'frustr', 'chorei', 'culpa', 'vergonha'] },
  { segmentId: 'superfa_engajado', emoji: '\u{1FA9E}', name: 'Identificacao e auto-reconhecimento',
    description: 'Se reconhecem nos conteudos: "me descreveu", "sou eu", "tudo que vc falou".',
    keywords: ['me identif', 'me descreveu', 'esse sou eu', 'sou assim', 'tudo que vc fal', 'tudo que voce', 'me vi em', 'minha vida', 'me conhec', 'definiu', 'igualzinho', 'eu sou', 'nossa eu', 'tenho todos', 'todos os sinais', 'todos os sintomas'] },
  { segmentId: 'superfa_engajado', emoji: '\u{1F9E0}', name: 'Relatos de sintomas cotidianos',
    description: 'Compartilham experiencias do dia a dia: esquecimentos, hiperfoco, procrastinacao, desorganizacao.',
    keywords: ['esquec', 'procrastin', 'hiper foco', 'hiperfoco', 'foco', 'desorganiz', 'bagunca', 'acumul', 'atraso', 'insonia', 'sono', 'rotina', 'concentr', 'foquei', 'focar', 'dopamina', 'lembro', 'memoria', 'peneira', 'ansiedade', 'impulsi', 'agitac', 'inquiet', 'sintoma', 'sinais'] },
  { segmentId: 'superfa_engajado', emoji: '\u{1F468}\u{200D}\u{1F469}\u{200D}\u{1F467}', name: 'Familia e relacionamentos',
    description: 'Comentarios sobre impacto em familia, filhos, conjuges.',
    keywords: ['meu filho', 'minha filha', 'minha mae', 'meu pai', 'meu marido', 'minha esposa', 'filhos', 'familia', 'namorad', 'casamento', 'parceiro', 'esposo'] },
  { segmentId: 'superfa_engajado', emoji: '\u{1F4BC}', name: 'Impacto na carreira',
    description: 'Relatos sobre trabalho, emprego, escola, faculdade — como TDAH afeta a vida profissional.',
    keywords: ['trabalho', 'emprego', 'carreira', 'empresa', 'chefe', 'faculdade', 'escola', 'professor', 'profiss'] },
  { segmentId: 'superfa_engajado', emoji: '\u{231B}', name: 'Diagnostico e descoberta tardia',
    description: 'Relatos de quando descobriram o TDAH, especialmente diagnostico tardio.',
    keywords: ['descobri', 'diagnos', 'fui diagnosticad', 'anos e', 'percebi que', 'aos 4', 'aos 5', 'aos 6', 'aos 3', 'desde crianc', 'desde pequen', 'minha infancia', 'na infancia'] },
  { segmentId: 'superfa_engajado', emoji: '\u{2753}', name: 'Perguntas ao Dr. Bruno',
    description: 'Superfas que fazem perguntas diretas, pedem conteudo ou orientacao.',
    keywords: ['doutor', 'dr.', 'dr bruno', 'por favor', 'pode falar', 'faz um video', 'video sobre', 'pode explicar', 'gostaria de saber', 'pergunt', 'duvida', 'como faz', 'sera que', 'existe algum', 'tem como'] },
  { segmentId: 'superfa_engajado', emoji: '\u{1F602}', name: 'Humor e auto-ironia',
    description: 'Comentarios com humor, piadas sobre o proprio TDAH. Rir de si mesmo como forma de lidar.',
    keywords: ['kkk', 'haha', 'kkkk', 'rsrs', 'piada', 'engracad', 'achava que era', 'PQP', 'faz sentido', 'morri', 'pqp'] },
  { segmentId: 'superfa_engajado', emoji: '\u{1F4A4}', name: 'Sono, energia e corpo',
    description: 'Exaustao, insonia, dificuldade pra acordar, relacao corpo-TDAH.',
    keywords: ['acordar', 'levantar', 'manha', 'exaust', 'energia', 'preguica', 'melatonina', 'cansac', 'dormir'] },
  { segmentId: 'superfa_engajado', emoji: '\u{1F48A}', name: 'Medicacao e tratamento',
    description: 'Relatos sobre remedios, efeitos colaterais, Ritalina, Venvanse, terapia.',
    keywords: ['ritalina', 'venvanse', 'medicac', 'remedio', 'tomo', 'receita', 'efeito colateral', 'terapia', 'psiquiatra', 'psicologo'] },
  { segmentId: 'superfa_engajado', emoji: '\u{1F9E9}', name: 'Comorbidades (TEA, bipolar, etc)',
    description: 'Mencao a autismo, bipolar, TOC, ansiedade generalizada junto com TDAH.',
    keywords: ['autismo', 'TEA', 'bipolar', 'TOC', 'ansiedade generalizada', 'comorbid', 'borderline', 'depressao'] },
  { segmentId: 'superfa_engajado', emoji: '\u{1F494}', name: 'Saudade e indiferenca emocional',
    description: 'Nao sentir saudade, nao ligar pra ninguem, frieza emocional involuntaria.',
    keywords: ['saudade', 'nao sinto', 'nao ligo', 'nao me importo', 'indiferenc', 'frio', 'distante'] },
  { segmentId: 'superfa_engajado', emoji: '\u{1F4AD}', name: 'Desabafos e reflexoes pessoais',
    description: 'Relatos pessoais, reflexoes sobre a propria vida, desabafos que nao se encaixam em temas especificos.',
    keywords: ['nunca', 'sempre', 'desde', 'minha vida', 'toda minha', 'pior', 'melhor', 'unica', 'verdade', 'real', 'problema', 'jeito', 'normal', 'diferente', 'estranho'] },

  // === FAMILIAR BUSCANDO ENTENDER (160) ===
  { segmentId: 'familiar', emoji: '\u{1F466}', name: 'Filho(a) diagnosticado(a)',
    description: 'Pais que descobriram TDAH no filho e buscam entender, apoiar ou tratar.',
    keywords: ['meu filho', 'minha filha', 'meu neto', 'minha neta', 'crianca', 'filho tem', 'filha tem', 'filho foi', 'filha foi', 'filho diagnosticad'] },
  { segmentId: 'familiar', emoji: '\u{1F494}', name: 'Convivencia dificil',
    description: 'Frustrados com a convivencia com alguem com TDAH. "Nao aguento mais".',
    keywords: ['conviver', 'cansativ', 'nao aguento', 'horrible', 'paciencia', 'enlouquec', 'dificil lidar', 'insustent'] },
  { segmentId: 'familiar', emoji: '\u{1F491}', name: 'Conjuge reconhecendo TDAH no parceiro',
    description: 'Esposa/marido que assistiu o video e reconheceu TDAH no parceiro.',
    keywords: ['meu marido', 'meu esposo', 'minha esposa', 'minha mulher', 'namorad', 'ex marido', 'ex esposa', 'parceiro'] },
  { segmentId: 'familiar', emoji: '\u{1F4A1}', name: 'Finalmente entendeu',
    description: 'Familiar que finalmente compreendeu comportamentos que antes nao faziam sentido.',
    keywords: ['agora entend', 'agora sei', 'faz sentido', 'finalmente', 'compreend', 'entendi'] },
  { segmentId: 'familiar', emoji: '\u{1F50D}', name: 'Buscando ajuda/orientacao',
    description: 'Familiares pedindo orientacao: onde levar, como ajudar, o que fazer.',
    keywords: ['como ajudar', 'o que fazer', 'onde lev', 'orientac', 'medicac', 'tratamento', 'profissional', 'psiquiatra', 'psicolog'] },

  // === MAE COM FILHOS E TDAH (234) ===
  { segmentId: 'mae_filhos', emoji: '\u{1F469}\u{200D}\u{1F467}', name: 'Reconhecendo TDAH no filho',
    description: 'Mae que reconhece TDAH no filho atraves do video. Descobrindo o diagnostico.',
    keywords: ['meu filho', 'minha filha', 'meu menino', 'minha menina', 'filho tem', 'filha tem', 'filho foi diagnosticad', 'filha foi diagnosticad', 'laudo', 'neuropediatra'] },
  { segmentId: 'mae_filhos', emoji: '\u{1FA9E}', name: 'Se reconhecendo como mae TDAH',
    description: 'Mae que se identifica com TDAH e percebe o impacto na maternidade.',
    keywords: ['sou mae', 'como mae', 'maternidade', 'me identif', 'eu tenho', 'sou assim', 'me descreveu', 'igualzinho'] },
  { segmentId: 'mae_filhos', emoji: '\u{1F614}', name: 'Culpa e julgamento',
    description: 'Mae julgada pela familia por comportamentos do TDAH. Culpa por "ser relapsa".',
    keywords: ['culpa', 'julgam', 'julga', 'relapsa', 'cobranca', 'vergonha', 'preguicosa', 'ninguem entend'] },
  { segmentId: 'mae_filhos', emoji: '\u{231B}', name: 'Descoberta tardia como mae',
    description: 'Mae que so descobriu TDAH depois de adulta/depois do diagnostico do filho.',
    keywords: ['descobri', 'diagnos', 'percebi', 'agora sei', 'agora entend', 'por causa do filho', 'por causa da filha', 'depois de adulta'] },
  { segmentId: 'mae_filhos', emoji: '\u{1F4AA}', name: 'Estrategias e apoio',
    description: 'Maes compartilhando estrategias, buscando ajuda ou celebrando conquistas.',
    keywords: ['estrategia', 'consegu', 'funciona', 'ajuda', 'apoio', 'suporte', 'tratamento', 'medicac', 'escola', 'acompanhamento'] },

  // === CASADO(A) LIDANDO COM TDAH NO CASAL (173) ===
  { segmentId: 'casado', emoji: '\u{1F494}', name: 'Casamento destruido/em crise',
    description: 'TDAH destruiu ou esta destruindo o casamento. Divorcio, separacao, terminos.',
    keywords: ['separac', 'divorc', 'terminei', 'terminou', 'destrui', 'acabou', 'perdi', 'nao aguent', 'insustent'] },
  { segmentId: 'casado', emoji: '\u{1F62E}\u{200D}\u{1F4A8}', name: 'Frustracao do(a) conjuge',
    description: 'Conjuge sem TDAH frustrado com o parceiro: esquecimentos, atrasos, desorganizacao.',
    keywords: ['paciencia', 'cansad', 'frustr', 'dificil conviver', 'nao entend', 'nao aceita', 'briga', 'discussao'] },
  { segmentId: 'casado', emoji: '\u{1F4A1}', name: 'TDAH explicou o casamento',
    description: 'Entender TDAH deu sentido a anos de conflitos. "Agora entendo meu marido/esposa".',
    keywords: ['agora entend', 'faz sentido', 'finalmente', 'compreend', 'salvou', 'mudou', 'explicou'] },
  { segmentId: 'casado', emoji: '\u{1F91D}', name: 'Conjuge como suporte',
    description: 'Parceiro(a) que apoia, compensa ou ajuda a gerenciar o TDAH.',
    keywords: ['me ajuda', 'minha esposa', 'meu marido', 'minha mulher', 'meu esposo', 'suporte', 'apoio', 'ajuda', 'paciencia'] },
  { segmentId: 'casado', emoji: '\u{1F62D}', name: 'Desabafo e dor no relacionamento',
    description: 'Desabafos sobre como TDAH afeta a relacao: grosseria, indiferenca, esquecimento.',
    keywords: ['sofr', 'dor', 'triste', 'chorei', 'dificil', 'culpa', 'vergonha', 'desculpa', 'grossa', 'grosso', 'magoa'] },
];

async function main() {
  console.log('Gerando sub-segmentos...\n');

  // Delete existing segment subclusters
  await sb.from('aud_subclusters').delete().eq('dimension', 'segmento');

  // Process each segment
  const segmentIds = [...new Set(SUB_SEGMENTS.map(s => s.segmentId))];

  for (const segId of segmentIds) {
    console.log(`\n=== ${segId} ===`);

    // Fetch comments for this segment using the same logic as the backend
    let comments: any[] = [];
    let offset = 0;
    while (true) {
      let query = sb.from('aud_comments')
        .select('id, text, peso_social')
        .eq('is_team', false).eq('is_channel_owner', false);

      if (segId === 'confirmado_perdido') {
        query = query.eq('perfil_diagnostico', 'confirmado')
          .or('perfil_em_tratamento.is.null,perfil_em_tratamento.eq.false');
      } else if (segId === 'descoberta') {
        query = query.eq('perfil_diagnostico', 'suspeita').eq('sentimento_geral', 'identificacao');
      } else if (segId === 'busca_ativa') {
        query = query.eq('perfil_diagnostico', 'suspeita').eq('sentimento_geral', 'frustracao');
      } else if (segId === 'em_tratamento') {
        query = query.eq('perfil_em_tratamento', true);
      } else if (segId === 'superfa_engajado') {
        // Get superfan URLs first
        const { data: fans } = await sb.from('aud_superfans')
          .select('author_channel_url').eq('is_superfan', true).eq('is_team', false);
        const urls = (fans || []).map(f => f.author_channel_url);
        // Fetch in chunks
        for (let i = 0; i < urls.length; i += 200) {
          const chunk = urls.slice(i, i + 200);
          const { data } = await sb.from('aud_comments')
            .select('id, text, peso_social')
            .in('author_channel_url', chunk)
            .eq('is_team', false)
            .range(0, 999);
          if (data) comments.push(...data);
        }
        break; // skip normal pagination
      } else if (segId === 'familiar') {
        // Via demandas table: psicoeducacao_terceiros
        const { data: demandas } = await sb.from('aud_demandas')
          .select('comment_id').eq('categoria', 'psicoeducacao_terceiros');
        const ids = [...new Set((demandas || []).map(d => d.comment_id))];
        for (let i = 0; i < ids.length; i += 200) {
          const chunk = ids.slice(i, i + 200);
          const { data } = await sb.from('aud_comments')
            .select('id, text, peso_social')
            .in('id', chunk)
            .eq('is_team', false).eq('is_channel_owner', false);
          if (data) comments.push(...data);
        }
        break;
      } else if (segId === 'mae_filhos') {
        query = query.eq('perfil_genero', 'feminino').eq('perfil_filhos', true);
      } else if (segId === 'casado') {
        query = query.ilike('perfil_estado_civil', '%casad%');
      }

      if (segId !== 'superfa_engajado') {
        const { data } = await query.range(offset, offset + 999);
        if (!data || data.length === 0) break;
        comments.push(...data);
        if (data.length < 1000) break;
        offset += 1000;
      }
    }

    console.log(`  Total comments: ${comments.length}`);

    // Get demanda descriptions too
    const allDemandas = await fetchDemandas(comments.map(c => c.id));

    // Classify each comment
    const subs = SUB_SEGMENTS.filter(s => s.segmentId === segId);
    const assigned = new Set<string>();

    for (const sub of subs) {
      const matching = comments.filter(c => {
        const text = (c.text || '').toLowerCase();
        const dems = (allDemandas[c.id] || []).join(' ').toLowerCase();
        const all = text + ' ' + dems;
        return sub.keywords.some(kw => all.includes(kw.toLowerCase()));
      });

      const ids = matching.map(c => c.id);
      ids.forEach(id => assigned.add(id));

      const quotes = matching
        .sort((a, b) => b.peso_social - a.peso_social)
        .slice(0, 3)
        .map(c => (c.text || '').slice(0, 200));

      await sb.from('aud_subclusters').insert({
        dimension: 'segmento',
        parent_value: segId,
        cluster_name: sub.name,
        cluster_description: sub.description,
        comment_ids: ids,
        example_quotes: quotes,
        count: ids.length,
      });

      console.log(`  ${sub.emoji} ${sub.name}: ${ids.length}`);
    }

    // "Outros" — comments not in any sub-segment
    const others = comments.filter(c => !assigned.has(c.id));
    if (others.length > 0) {
      const quotes = others
        .sort((a, b) => b.peso_social - a.peso_social)
        .slice(0, 3)
        .map(c => (c.text || '').slice(0, 200));

      await sb.from('aud_subclusters').insert({
        dimension: 'segmento',
        parent_value: segId,
        cluster_name: 'Outros',
        cluster_description: 'Comentarios que nao se encaixam nos sub-segmentos acima.',
        comment_ids: others.map(c => c.id),
        example_quotes: quotes,
        count: others.length,
      });

      console.log(`  \u{1F4CC} Outros: ${others.length}`);
    }

    const total = comments.length;
    const classified = assigned.size;
    console.log(`  Cobertura: ${classified}/${total} (${Math.round(classified / total * 100)}%) + ${others.length} outros`);
  }

  const { count } = await sb.from('aud_subclusters').select('*', { count: 'exact', head: true }).eq('dimension', 'segmento');
  console.log(`\nTotal segment subclusters: ${count}`);
}

async function fetchDemandas(commentIds: string[]): Promise<Record<string, string[]>> {
  const map: Record<string, string[]> = {};
  for (let i = 0; i < commentIds.length; i += 200) {
    const chunk = commentIds.slice(i, i + 200);
    const { data } = await sb.from('aud_demandas')
      .select('comment_id, descricao')
      .in('comment_id', chunk);
    for (const d of data || []) {
      if (!map[d.comment_id]) map[d.comment_id] = [];
      map[d.comment_id].push(d.descricao || '');
    }
  }
  return map;
}

main().catch(console.error);
