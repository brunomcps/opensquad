export interface ProductContent {
  assessment?: {
    totalItems: number;
    duration: string;
    modules: Array<{
      name: string;
      items: number;
      description?: string;
      subModules?: Array<{
        name: string;
        items: number;
        sampleItems?: string[];
      }>;
    }>;
    // MAPA: 7 padrões funcionais proprietários
    patterns?: Array<{
      id: number;
      name: string;
      emoji: string;
      brainRegion: string;
      subtitle: string;
      complaints: string[];
      sampleItems: string[];
    }>;
    // 2AS: domínios organizados por bloco
    domainBlocks?: Array<{
      blockName: string;
      color?: string;
      domains: Array<{
        id: string;
        name: string;
        items: number;
        description?: string;
        itemTexts?: string[];
      }>;
    }>;
    sampleQuestions: Array<{
      context: string;
      question: string;
    }>;
  };
  scoring?: {
    formula: string;
    modifiers?: string[];
    ranges: Array<{
      label: string;
      range: string;
      color: string;
    }>;
    subtypes?: string[];
    domainRanges?: Array<{
      label: string;
      range: string;
    }>;
    referenceInstruments?: string[];
    preSummarization?: string;
  };
  // MAPA: 2 relatórios (Pessoal + Clínico)
  reports?: {
    personal: { pages: string; audience: string; tone: string; description: string };
    clinical: { pages: string; audience: string; tone: string; description: string };
  };
  // 2AS: 3 relatórios independentes
  reportList?: Array<{
    name: string;
    color: string;
    pages: string;
    description: string;
    sections: string[];
    status?: string;
  }>;
  landingPage?: {
    headline: string;
    subtitle: string;
    badges: string[];
    anchor: string;
    painPoints: string[];
    costComparison: Array<{ item: string; cost: string }>;
    sections?: string[];
    offerPrice: string;
    orderBumps?: Array<{ name: string; originalPrice: string; price: string; rating?: string }>;
    guarantee: string;
    faq?: string[];
    url: string;
  };
  contentStructure?: Array<{
    part: string;
    topics: Array<{
      name: string;
      strategies?: string[];
    }>;
  }>;
  concepts?: string[];
  bonusKit?: string[];
  visual?: string[];
  pipeline?: Array<{ step: string; tool: string }>;
  ecosystem?: Array<{
    name: string;
    role: string;
    price: string;
    funnelPosition: string;
  }>;
  links?: Array<{ label: string; url: string }>;
}

const SHARED_ECOSYSTEM = [
  { name: 'MAPA-7P', role: 'Triagem TDAH', price: 'R$ 147', funnelPosition: 'Produto principal' },
  { name: '2AS', role: 'Rastreio TEA/AH-SD/2e', price: 'R$ 147', funnelPosition: 'Produto principal' },
  { name: 'Guia Rápido', role: 'Ação TDAH', price: 'R$ 49,20', funnelPosition: 'Order bump MAPA' },
  { name: 'Rotina Sob Medida', role: 'Estrutura TDAH', price: 'R$ 27,90', funnelPosition: 'Order bump MAPA' },
];

const MAPA_CONTENT: ProductContent = {
  assessment: {
    totalItems: 88,
    duration: '~25 minutos',
    modules: [
      { name: 'Parte 0 — Dados Pessoais', items: 6, description: 'Nome, email, idade, sexo, diagnóstico, tratamento' },
      {
        name: 'Parte 1 — ASRS v1.1', items: 18,
        subModules: [
          {
            name: 'Bloco A — Desatenção', items: 9,
            sampleItems: [
              'Cometo erros por descuido em tarefas do trabalho ou do dia a dia, mesmo quando sei fazer.',
              'Tenho dificuldade de manter a atenção em tarefas longas, palestras ou leituras.',
              'As pessoas dizem que parece que não estou ouvindo quando falam comigo, mesmo sem distração óbvia.',
              'Começo tarefas mas não consigo terminar, ou perco o fio do que estava fazendo.',
              'Tenho dificuldade de organizar tarefas, manter coisas em ordem ou gerenciar meu tempo.',
              'Evito ou reluto em começar tarefas que exigem esforço mental prolongado.',
              'Perco coisas importantes com frequência: chaves, carteira, celular, documentos.',
              'Me distraio facilmente com coisas ao redor ou com pensamentos não relacionados.',
              'Esqueço de fazer coisas do dia a dia: pagar contas, retornar ligações, compromissos.',
            ],
          },
          {
            name: 'Bloco B — Hiperatividade/Impulsividade', items: 9,
            sampleItems: [
              'Fico mexendo as mãos, pés, ou me remexendo quando preciso ficar sentado.',
              'Tenho dificuldade de permanecer sentado em reuniões, aulas ou outras situações.',
              'Sinto uma inquietação interna, como se tivesse um \'motor ligado\' por dentro.',
              'Tenho dificuldade de relaxar ou fazer atividades tranquilas no tempo livre.',
              'Sinto que estou sempre \'a mil\', ou as pessoas dizem que sou agitado demais.',
              'Falo demais, ou as pessoas já comentaram que eu falo muito.',
              'Respondo antes das pessoas terminarem de perguntar, ou completo frases dos outros.',
              'Tenho dificuldade de esperar minha vez em filas ou conversas.',
              'Interrompo conversas, ou me intrometo no que os outros estão fazendo.',
            ],
          },
        ],
      },
      { name: 'Parte 2 — 7 Padrões Funcionais', items: 21, description: '3 itens por padrão, proprietários' },
      {
        name: 'Parte 3 — Comorbidades', items: 19,
        description: 'PM Presença Mental/Dissociação, EB Estado de Humor/Depressão, TI Tensão Interna/Ansiedade, SR Sono e Recuperação, MI Memórias Intrusivas/Trauma, HR Hábitos e Rotina/Telas',
        subModules: [
          {
            name: 'PM — Presença Mental / Dissociação', items: 3,
            sampleItems: [
              'Quando dou por mim, estou no meio de uma atividade sem lembrar como comecei.',
              'Pessoas me contam sobre conversas ou coisas que fiz e eu não tenho memória disso.',
              'Às vezes me sinto desconectado de mim mesmo, como se estivesse no \'piloto automático\'.',
            ],
          },
          {
            name: 'EB — Estado de Humor / Depressão', items: 3,
            sampleItems: [
              'Me sinto triste, vazio ou sem esperança na maior parte do dia.',
              'Perdi o interesse ou prazer em coisas que antes eu gostava.',
              'Sinto que minha mente está mais lenta que o normal.',
            ],
          },
          {
            name: 'TI — Tensão Interna / Ansiedade', items: 3,
            sampleItems: [
              'Preocupações ficam \'girando\' na minha cabeça e não consigo parar de pensar nelas.',
              'Fico antecipando problemas ou imaginando cenários ruins que podem acontecer.',
              'Sinto tensão física frequente: mandíbula travada, ombros tensos, aperto no peito.',
            ],
          },
          {
            name: 'SR — Sono e Recuperação', items: 3,
            sampleItems: [
              'Tenho dificuldade para pegar no sono, mesmo quando estou cansado.',
              'Acordo várias vezes durante a noite ou muito cedo sem conseguir voltar a dormir.',
              'Mesmo dormindo horas suficientes, acordo cansado, meu sono não me recupera.',
            ],
          },
          {
            name: 'MI — Memórias Intrusivas / Trauma', items: 3,
            sampleItems: [
              'Lembranças de coisas ruins do passado invadem minha mente sem eu querer.',
              'Evito lugares, pessoas ou situações que me lembram de experiências difíceis.',
              'Fico em estado de alerta, como se algo ruim pudesse acontecer a qualquer momento.',
            ],
          },
          {
            name: 'HR — Hábitos e Rotina / Telas', items: 4,
            sampleItems: [
              'Passo várias horas por dia em redes sociais, vídeos curtos ou navegação sem propósito.',
              'Uso álcool, maconha ou outras substâncias com frequência (mais de 2x por semana).',
              'Consumo café, energético ou estimulantes em quantidade que me deixa agitado.',
              'Minha rotina está tão sobrecarregada que não tenho tempo livre real.',
            ],
          },
        ],
      },
      {
        name: 'Parte 4 — Rastreio TEA', items: 17,
        description: 'CS Comunicação Social, IS Interação Social, PS Percepção Social, PR Padrões Restritos, SE Sensorialidade',
        subModules: [
          {
            name: 'CS — Comunicação Social', items: 3,
            sampleItems: [
              'Tenho dificuldade em manter o \'vai e vem\' natural de uma conversa.',
              'As pessoas dizem que minhas expressões faciais não combinam com o que estou sentindo.',
              'Tenho dificuldade em saber quando é minha vez de falar.',
            ],
          },
          {
            name: 'IS — Interação Social', items: 3,
            sampleItems: [
              'Prefiro atividades solitárias mesmo quando há oportunidade de estar com outros.',
              'Tenho dificuldade em fazer ou manter amizades, mesmo querendo.',
              'Interações sociais me deixam exausto.',
            ],
          },
          {
            name: 'PS — Percepção Social', items: 3,
            sampleItems: [
              'Tenho dificuldade em perceber ironia, sarcasmo ou piada.',
              'Levo as coisas ao pé da letra.',
              'Não percebo quando estou incomodando alguém.',
            ],
          },
          {
            name: 'PR — Padrões Restritos', items: 5,
            sampleItems: [
              'Tenho interesses muito intensos em assuntos específicos.',
              'Mudanças inesperadas na rotina me perturbam muito.',
              'Tenho maneiras específicas de fazer as coisas.',
              'Tenho movimentos repetitivos.',
              'Repito frases, sons ou palavras.',
            ],
          },
          {
            name: 'SE — Sensorialidade', items: 3,
            sampleItems: [
              'Sou muito sensível a certos sons, luzes, texturas ou cheiros.',
              'Certas texturas de roupa ou etiquetas me incomodam.',
              'Ambientes com muitos estímulos me sobrecarregam.',
            ],
          },
        ],
      },
      {
        name: 'Parte 5 — Histórico', items: 7,
        description: 'Início dos sintomas, histórico escolar, familiar, áreas afetadas, nível de prejuízo, tentativas anteriores, expectativas',
        subModules: [
          {
            name: 'Perguntas de Histórico', items: 7,
            sampleItems: [
              'Desde que idade você percebe essas dificuldades? (sempre/infância/adolescência/adulto/incerto)',
              'Na infância/escola, você tinha dificuldades parecidas?',
              'Alguém na sua família tem TDAH ou sintomas parecidos?',
              'Em quais áreas essas dificuldades mais te afetam? (trabalho/estudos/relacionamento/família)',
              'O quanto essas dificuldades prejudicam sua vida? (muito/moderado/pouco/nenhum)',
              'O que você já tentou? (medicação/terapia/coaching/apps/livros)',
              'O que você espera ao fazer o MAPA? (texto livre)',
            ],
          },
        ],
      },
    ],
    patterns: [
      {
        id: 1, name: 'Inércia Inicial', emoji: '🪨', brainRegion: 'Córtex Pré-frontal Dorsolateral',
        subtitle: 'Travo e não consigo começar',
        complaints: ['Paralisia por Sobrecarga', 'Perfeccionismo', 'Indefinição'],
        sampleItems: [
          'Quando tenho muita coisa pra fazer, travo e não consigo começar nenhuma.',
          'Se não puder fazer direito ou completo, prefiro nem começar.',
          'Sei o que preciso fazer, mas não sei qual é o primeiro passo concreto.',
        ],
      },
      {
        id: 2, name: 'Caça ao Prazer', emoji: '🎰', brainRegion: 'Núcleo Accumbens',
        subtitle: 'Só funciono na pressão',
        complaints: ['Vício em Novidade', 'Refém do Agora', 'Dependência de Adrenalina'],
        sampleItems: [
          'Me entedio muito rápido com coisas que antes me interessavam. Preciso sempre de algo novo.',
          'É muito difícil fazer algo chato agora pensando em um benefício futuro.',
          'Só consigo funcionar direito quando tem pressão, urgência ou risco real.',
        ],
      },
      {
        id: 3, name: 'Cegueira Temporal', emoji: '⏰', brainRegion: 'Circuitos de Timing',
        subtitle: 'O tempo escapa',
        complaints: ['Atraso Crônico', 'Agenda Impossível', 'Urgência Anestesiada'],
        sampleItems: [
          'Chego atrasado mesmo quando quero muito ser pontual. O tempo \'escapa\'.',
          'Faço planos impossíveis de cumprir e me frustro quando não dá certo.',
          'Mesmo sabendo que vou me prejudicar, não sinto a urgência até ser tarde demais.',
        ],
      },
      {
        id: 4, name: 'Montanha-Russa Emocional', emoji: '🎢', brainRegion: 'Amígdala',
        subtitle: 'Minha raiva sai do zero ao cem',
        complaints: ['Explosividade', 'Sensibilidade à Rejeição (RSD)', 'Humor Volátil'],
        sampleItems: [
          'Minha raiva sai do zero ao cem muito rápido, por coisas que depois parecem bobas.',
          'Críticas ou sinais de rejeição me afetam muito mais do que deveria.',
          'Meu humor muda várias vezes ao dia sem motivo claro.',
        ],
      },
      {
        id: 5, name: 'Oscilação de Energia', emoji: '🔋', brainRegion: 'Sistema de Ativação Reticular',
        subtitle: 'Alguns dias ligo, outros apago',
        complaints: ['Inconsistência Diária', 'Inconsistência Intradia', 'Ciclos Boom-Crash'],
        sampleItems: [
          'Alguns dias acordo ligado e produtivo, outros não consigo fazer nada — sem explicação.',
          'Minha energia não bate com o momento: acordo no meio da noite cheio de ideias.',
          'Tenho dias de super produtividade seguidos de dias de exaustão total.',
        ],
      },
      {
        id: 6, name: 'Hiperfoco', emoji: '🎯', brainRegion: 'Default Mode Network',
        subtitle: 'Mergulho e esqueço do mundo',
        complaints: ['Hiperfoco de Escape', 'Hiperfoco sem Freio', 'Rigidez de Transição'],
        sampleItems: [
          'Quando estou estressado ou precisando escapar, mergulho em algo e esqueço do resto.',
          'Fico tão absorvido que esqueço de comer, dormir ou ir ao banheiro.',
          'Quando estou no meio de algo, é muito difícil mudar para outra atividade mesmo quando preciso.',
        ],
      },
      {
        id: 7, name: 'Neblina Mental', emoji: '🧠', brainRegion: 'Memória de Trabalho',
        subtitle: 'Minha mente parece embaralhada',
        complaints: ['Mente Embaralhada', 'Bloqueio de Expressão', 'Leitura em Loop'],
        sampleItems: [
          'Tenho dificuldade de organizar meus pensamentos. Minha mente parece confusa ou \'embaralhada\'.',
          'As palavras me faltam quando quero explicar algo. Sei o que quero dizer mas não consigo expressar.',
          'Preciso reler textos várias vezes para entender. A informação não \'entra\' de primeira.',
        ],
      },
    ],
    sampleQuestions: [
      { context: 'Inércia Inicial', question: 'Quando tenho muita coisa pra fazer, travo e não consigo começar nenhuma.' },
      { context: 'Caça ao Prazer', question: 'Faço o que é gostoso antes do que é importante.' },
      { context: 'Cegueira Temporal', question: 'Chego atrasado mesmo quando tento sair no horário.' },
      { context: 'Montanha-Russa Emocional', question: 'Explodo por coisas pequenas e depois me arrependo.' },
      { context: 'Oscilação de Energia', question: 'Minha energia é imprevisível — nunca sei como vou acordar.' },
      { context: 'Hiperfoco', question: 'Me perco em atividades irrelevantes enquanto o importante espera.' },
    ],
  },
  scoring: {
    formula: 'Score base = (ASRS / 72) x 100',
    modifiers: [
      'Início dos sintomas: +5 a -5',
      'Histórico escolar: +3 a -3',
      'Histórico familiar: +3 / +2',
      'Nível de prejuízo: +2 / +1',
    ],
    ranges: [
      { label: 'Muito Alta', range: '≥ 80', color: '#c0392b' },
      { label: 'Alta', range: '60 - 79', color: '#5b9bd5' },
      { label: 'Moderada', range: '40 - 59', color: '#e67e22' },
      { label: 'Baixa', range: '< 40', color: '#27ae60' },
    ],
    subtypes: [
      'Desatento: A > B + 15',
      'Hiperativo: B > A + 15',
      'Combinado: demais casos',
    ],
  },
  reports: {
    personal: {
      pages: '8-12 páginas',
      audience: 'Para o próprio usuário',
      tone: 'Acolhedor e didático',
      description: 'Relatório de autoconhecimento e validação pessoal. Linguagem acessível, foco em ajudar a pessoa a entender seus padrões.',
    },
    clinical: {
      pages: '4-6 páginas',
      audience: 'Para profissional de saúde',
      tone: 'Técnico e objetivo',
      description: 'Relatório estruturado para levar ao psicólogo ou psiquiatra. Dados quantitativos, escores e interpretação clínica.',
    },
  },
  landingPage: {
    headline: 'Você não é preguiçoso. Você não é burro. Você pode ter TDAH.',
    subtitle: 'Triagem online de TDAH adulto. Descubra em 25 minutos se a sua preguiça tem nome e solução.',
    badges: ['100% Online', 'Resultado em 24h', 'Garantia de 7 dias'],
    anchor: 'Sem gastar +R$3.000 em consultas. Sem esperar meses. Do sofá. Agora.',
    painPoints: [
      'Cansaço', 'Inquietação', 'Procrastinação', 'Desorganização',
      'Atrasos constantes', 'Rotinas abandonadas', 'Projetos inacabados',
      'Perda de objetos', 'Esquecimentos', 'Impaciência', 'Distração',
    ],
    costComparison: [
      { item: 'Psicólogo (~3-5 sessões)', cost: 'R$ 750 - 2.000' },
      { item: 'Psiquiatra', cost: 'R$ 500 - 800' },
      { item: 'Avaliação neuropsicológica', cost: 'R$ 1.500 - 3.000' },
      { item: 'Tempo de espera', cost: '2 - 6 meses' },
    ],
    sections: [
      'A Dor (11 sintomas)', 'Custo do Status Quo (tabela R$750-5.800)', 'A Saída',
      'O Produto', 'O que Recebe (5 entregáveis)', 'Como Funciona (3 passos)',
      '7 Padrões', 'Autor', 'Oferta (12x R$14,70 de R$497)',
      'Garantia 7d', 'FAQ (5 perguntas)', 'Fechamento',
    ],
    offerPrice: '12x de R$ 14,70 (70% OFF de R$ 497)',
    orderBumps: [
      { name: 'Guia Rápido TDAH', originalPrice: 'R$ 89', price: 'R$ 49,20', rating: '4.92/5' },
      { name: 'Rotina Sob Medida', originalPrice: 'R$ 55,90', price: 'R$ 27,90' },
    ],
    guarantee: '7 dias incondicional',
    faq: [
      'Isso substitui uma consulta médica?',
      'E se eu não tiver TDAH?',
      'Quanto tempo leva para receber?',
      'Posso levar para meu médico?',
      'E se eu não gostar?',
    ],
    url: 'https://brunosallesphd.kpages.online/',
  },
  pipeline: [
    { step: 'Formulário', tool: 'Tally' },
    { step: 'Pagamento', tool: 'Hotmart' },
    { step: 'Orquestração', tool: 'Make.com' },
    { step: 'Geração IA', tool: 'Claude API' },
    { step: 'Entrega', tool: 'Gmail (PDF)' },
  ],
  ecosystem: SHARED_ECOSYSTEM,
  links: [
    { label: 'Landing Page', url: 'https://brunosallesphd.kpages.online/' },
    { label: 'Hotmart', url: 'https://brunosallesphd.com.br' },
    { label: 'Exemplo Relatório Pessoal', url: 'squads/infoprodutos/mapa/exemplo-relatorio-pessoal.pdf' },
    { label: 'Exemplo Relatório Clínico', url: 'squads/infoprodutos/mapa/exemplo-relatorio-clinico.pdf' },
  ],
};

const GUIA_RAPIDO_CONTENT: ProductContent = {
  contentStructure: [
    {
      part: 'Parte 1 — Fundamentos',
      topics: [
        { name: 'Antes de Começar' },
        { name: 'O Básico', strategies: ['Dopamina', 'Córtex Pré-frontal', 'Norepinefrina'] },
      ],
    },
    {
      part: 'Parte 2 — Os 4 Pilares',
      topics: [
        { name: 'Ativação', strategies: ['Regra dos 2 Minutos', 'Body Doubling', 'Ritual de Ignição', 'Micro-Injeções de Novidade', 'Deadline Artificial', 'Começar Pelo Meio', 'Matemática da Ativação'] },
        { name: 'Foco', strategies: ['Ambiente Blindado', 'Blocos Calibrados', 'Âncora Sensorial', 'Lista de Captura de Distrações'] },
        { name: 'Memória de Trabalho', strategies: ['Captura em 10 Segundos', 'Sistema Único', 'Alarmes de Contexto', 'Lugar Fixo', 'Revisão Diária', 'Regra dos 3 Elementos'] },
        { name: 'Percepção de Tempo', strategies: ['Tempo Visível', 'Multiplica por 2', 'Buffers', 'Alarmes de Transição'] },
      ],
    },
    {
      part: 'Parte 3 — Emoções',
      topics: [
        { name: 'Regulação Emocional', strategies: ['Regra dos 20 Minutos', 'Nomear para Domar', 'Movimento Reset', 'Protocolo STOP'] },
        { name: 'Relacionamentos', strategies: ['Padrões comuns', 'Modelo de conversa TDAH', 'Ciclo pai/mãe-filho'] },
      ],
    },
    {
      part: 'Parte 4 — Corpo',
      topics: [
        { name: 'Sono', strategies: ['Alarme de Desligamento', 'Quarentena de Celular', 'Ritual de Descompressão', 'Brain Dump'] },
        { name: 'Exercício' },
        { name: 'Alimentação' },
      ],
    },
    {
      part: 'Parte 5 — Trabalho',
      topics: [
        { name: 'TDAH no Trabalho', strategies: ['Reuniões', 'Emails', 'Projetos'] },
        { name: 'Finanças', strategies: ['Regra das 48h', 'Automação de contas'] },
      ],
    },
    {
      part: 'Parte 6 — Aprofundamentos',
      topics: [
        { name: 'Procrastinação', strategies: ['Tipos de procrastinação'] },
        { name: 'Hiperfoco', strategies: ['Quando ajuda', 'Quando atrapalha'] },
        { name: 'Autocompaixão', strategies: ['3 componentes'] },
      ],
    },
    {
      part: 'Bônus',
      topics: [
        { name: 'Cartão de Referência Rápida' },
      ],
    },
  ],
  visual: [
    'Tema escuro',
    'Acentos dourados',
    'Selo "Baseado em Neurociência"',
    'Tags de neurotransmissor por estratégia',
  ],
  landingPage: {
    headline: 'Guia Rápido TDAH',
    subtitle: 'Estratégias práticas para agir imediatamente após o diagnóstico.',
    badges: ['PDF Digital', 'Acesso Imediato'],
    anchor: '',
    painPoints: [],
    costComparison: [],
    offerPrice: 'R$ 49,20',
    guarantee: '7 dias incondicional',
    url: 'https://brunosallesphd.com.br',
  },
  ecosystem: SHARED_ECOSYSTEM,
  links: [
    { label: 'Hotmart', url: 'https://brunosallesphd.com.br' },
  ],
};

const MANUAL_ROTINA_CONTENT: ProductContent = {
  contentStructure: [
    {
      part: 'Parte 1 — Fundamentos (p4-10)',
      topics: [
        { name: 'Por que rotinas falham no TDAH' },
        { name: 'Neurociência', strategies: ['Gânglios da base', 'Dopamina', 'Córtex pré-frontal', 'Memória de trabalho'] },
        { name: 'O paradoxo "precisa mas sufoca"' },
      ],
    },
    {
      part: 'Parte 2 — Os 4 Princípios (p11-21)',
      topics: [
        { name: 'Contexto (não horário)' },
        { name: 'Escada (não muro)' },
        { name: 'Corpo Primeiro' },
        { name: 'Mínimo Funcional' },
      ],
    },
    {
      part: 'Parte 3 — Diagnóstico Pessoal (p25-30)',
      topics: [
        { name: 'Mapa de energia' },
        { name: 'Hábitos que funcionam' },
        { name: '6 Sabotadores', strategies: ['Perfeccionismo de planejamento', 'Tudo ou nada', 'Comparação', 'Acúmulo', 'Expectativa de motivação', 'Reinício constante'] },
      ],
    },
    {
      part: 'Parte 4 — O Método: 6 passos em 30min (p33-39)',
      topics: [
        { name: '1. Queima o arquivo' },
        { name: '2. Mapa de energia' },
        { name: '3. Blocos por contexto' },
        { name: '4. Âncoras físicas' },
        { name: '5. Versão completa + Versão mínima' },
        { name: '6. Teste 7 dias' },
      ],
    },
    {
      part: 'Parte 5 — Rotinas Específicas (p50-59)',
      topics: [
        { name: 'Rotina de manhã' },
        { name: 'Rotina de trabalho' },
        { name: 'Rotina de noite' },
        { name: 'Rotina de fim de semana' },
      ],
    },
    {
      part: 'Parte 6 — Quando Quebra (p63-67)',
      topics: [
        { name: 'Sinais de ajuste' },
        { name: 'Protocolo de recuperação' },
        { name: 'Iteração contínua' },
      ],
    },
    {
      part: 'Parte 7 — Templates (p70-78)',
      topics: [
        { name: 'Mapa de energia' },
        { name: 'Rotina completa / mínima' },
        { name: 'Registro 7 dias' },
        { name: 'Exemplo: Maria' },
      ],
    },
  ],
  concepts: [
    'Blocos por Contexto',
    'Versão Completa + Mínima',
    'Âncora Física',
    'Regra do 5',
    'Mapa de Energia',
    '6 Sabotadores',
    'Protocolo de Recuperação',
    'Teste 7 Dias',
  ],
  bonusKit: [
    'Mapa de Energia',
    'Rotina Manhã',
    'Rotina Noite',
    'Blocos Trabalho/Transição',
    'Registro 7 Dias + Revisão',
  ],
  landingPage: {
    headline: 'Manual de Rotina Sob Medida',
    subtitle: 'Construa uma rotina personalizada que funciona com o seu cérebro TDAH.',
    badges: ['PDF Digital', 'Acesso Imediato', '78 páginas', 'Kit Bônus (6 pags)'],
    anchor: '',
    painPoints: [],
    costComparison: [],
    offerPrice: 'R$ 27,90',
    guarantee: '7 dias incondicional',
    url: 'https://brunosallesphd.com.br',
  },
  ecosystem: SHARED_ECOSYSTEM,
  links: [
    { label: 'Hotmart', url: 'https://brunosallesphd.com.br' },
  ],
};

const DUAS_AS_CONTENT: ProductContent = {
  assessment: {
    totalItems: 96,
    duration: '~15-20 minutos',
    modules: [
      { name: 'Bloco 1 — TEA', items: 36, description: '6 domínios de rastreio de Transtorno do Espectro Autista' },
      { name: 'Bloco 2 — AH/SD', items: 40, description: '10 domínios de rastreio de Altas Habilidades/Superdotação' },
      { name: 'Bloco 3 — 2e', items: 16, description: '4 domínios de Dupla Excepcionalidade' },
      { name: 'Eixos de Interação', items: 5, description: 'Itens bipolares TEA↔AH/SD com gradiente de 5 opções. Geram dois scores simultâneos.' },
    ],
    domainBlocks: [
      {
        blockName: 'TEA — Transtorno do Espectro Autista',
        color: '#5b9bd5',
        domains: [
          {
            id: 'D1.1', name: 'Percepção Social', items: 7,
            description: 'Como você lê o ambiente e as emoções alheias',
            itemTexts: [
              'Só percebo que alguém está chateado quando fala diretamente',
              'Costumo demorar pra perceber o \'clima\' do ambiente',
              'Tenho dificuldade em entender o que a pessoa realmente quer dizer quando não fala de forma direta',
              'Quando alguém me conta algo triste, nem sempre sei como reagir na hora',
              'Já me aconteceu de descobrir dias depois que alguém estava com raiva de mim',
              'Pessoas próximas já me disseram que pareço \'desligado\' durante conversas',
              '[R] Costumo perceber rapidamente quando alguém está desconfortável',
            ],
          },
          {
            id: 'D1.2', name: 'Comunicação', items: 7,
            description: 'Linguagem literal, contato visual, timing em conversas',
            itemTexts: [
              'Quando alguém faz comentário sarcástico, levo ao pé da letra',
              'Manter contato visual exige esforço consciente',
              'Em conversas de grupo, tenho dificuldade em saber a hora de entrar',
              'Minha expressão facial não corresponde ao que estou sentindo',
              'Já me disseram que falo sobre meus assuntos sem perceber que a pessoa perdeu o interesse',
              'Já me falaram que meu jeito de falar é diferente',
              '[R] Expressões como \'deixa pra lá\' são fáceis pra mim de interpretar pelo tom',
            ],
          },
          {
            id: 'D1.3', name: 'Interação Social', items: 6,
            description: 'Preferência por solidão, esforço para manter amizades',
            itemTexts: [
              'Prefiro ficar sozinho ou com poucos próximos',
              'Manter amizades exige esforço consciente',
              'Preciso de tempo sozinho após eventos sociais',
              'Tenho vontade de ter mais conexões mas não sei como',
              'Meus relacionamentos tendem a ser ou muito intensos ou bastante superficiais',
              '[R] Fazer novas amizades sempre foi fácil e natural',
            ],
          },
          {
            id: 'D1.4', name: 'Padrões e Rotinas', items: 6,
            description: 'Interesses intensos, necessidade de previsibilidade, rituais',
            itemTexts: [
              'Quando me interesso por um assunto, mergulho de um jeito excessivo',
              'Mudanças inesperadas na rotina me desestabilizam',
              'É difícil mudar de abordagem mesmo quando sugerem caminho melhor',
              'Tenho movimentos/gestos repetitivos',
              'Tenho rituais ou sequências no dia a dia',
              '[R] Quando planos mudam de última hora, consigo me adaptar',
            ],
          },
          {
            id: 'D1.5', name: 'Sensorialidade', items: 5,
            description: 'Hiper/hipossensibilidade a sons, texturas, luzes, cheiros',
            itemTexts: [
              'Ambientes com muitos estímulos me sobrecarregam',
              'Sons, texturas ou cheiros quase insuportáveis',
              'Busco sensações que me acalmam',
              'Não percebo coisas que outros percebem',
              '[R] Consigo ficar confortável em ambientes barulhentos',
            ],
          },
          {
            id: 'D1.6', name: 'Masking (Esforço Invisível)', items: 5,
            description: 'Atuar em público, regras aprendidas como manual, esgotamento social',
            itemTexts: [
              'Sinto que estou \'atuando\' em situações sociais',
              'Aprendi regras sociais como um manual',
              'Depois de interação social, me sinto esgotado além de cansaço',
              'Evito ou escondo comportamentos \'estranhos\'',
              'Disseram que sou pessoa muito diferente em público vs casa',
            ],
          },
        ],
      },
      {
        blockName: 'AH/SD — Altas Habilidades/Superdotação',
        color: '#8b5cf6',
        domains: [
          { id: 'D2.1', name: 'Capacidade Intelectual', items: 6 },
          { id: 'D2.2', name: 'Criatividade', items: 4 },
          { id: 'D2.3', name: 'Comprometimento com a Tarefa', items: 4 },
          { id: 'D2.4', name: 'Intensidade Emocional', items: 4, description: 'Overexcitability de Dabrowski' },
          { id: 'D2.5', name: 'Intensidade Intelectual', items: 4, description: 'Overexcitability de Dabrowski' },
          { id: 'D2.6', name: 'Intensidade Imaginativa', items: 4, description: 'Overexcitability de Dabrowski' },
          { id: 'D2.7', name: 'Intensidade Sensorial', items: 3, description: 'Overexcitability de Dabrowski' },
          { id: 'D2.8', name: 'Intensidade Psicomotora', items: 3, description: 'Overexcitability de Dabrowski' },
          { id: 'D2.9', name: 'Assincronia Interna', items: 4, description: 'Descompasso entre capacidade cognitiva e emocional' },
          { id: 'D2.10', name: 'Assincronia Social', items: 4, description: 'Descompasso entre a pessoa e o ambiente social' },
        ],
      },
      {
        blockName: '2e — Dupla Excepcionalidade',
        color: '#6366f1',
        domains: [
          { id: 'D3.1', name: 'Mascaramento', items: 4, description: 'AH/SD mascara sinais de TEA e vice-versa' },
          { id: 'D3.2', name: 'Compensação', items: 4, description: 'Inteligência compensa dificuldades autistas' },
          { id: 'D3.3', name: 'Conflito Interno', items: 4, description: 'Tensão entre capacidade e limitação' },
          { id: 'D3.4', name: 'Impacto Funcional', items: 4, description: 'Efeito combinado na vida prática' },
        ],
      },
    ],
    sampleQuestions: [
      { context: 'Percepção Social (TEA)', question: 'Só percebo que alguém ficou chateado comigo quando a pessoa fala diretamente.' },
      { context: 'Sensorialidade (TEA)', question: 'Certos sons, texturas ou cheiros me incomodam a ponto de precisar sair do ambiente.' },
      { context: 'Masking (TEA)', question: 'Em situações sociais, sinto que estou "atuando" — seguindo um roteiro interno.' },
      { context: 'Capacidade Intelectual (AH/SD)', question: 'Aprendo em semanas o que a maioria das pessoas leva meses pra aprender.' },
    ],
  },
  scoring: {
    formula: 'Score base = (soma dos itens / máximo possível) x 100',
    modifiers: [
      'Eixos de interação: +1 a +5',
      'Masking D3.1: +1 a +3',
    ],
    ranges: [
      { label: 'Muito Alta', range: '≥ 80', color: '#c0392b' },
      { label: 'Alta', range: '≥ 60', color: '#5b9bd5' },
      { label: 'Moderada', range: '≥ 40', color: '#e67e22' },
      { label: 'Baixa', range: '< 40', color: '#27ae60' },
    ],
    domainRanges: [
      { label: 'Intenso', range: '≥ 75%' },
      { label: 'Moderado', range: '≥ 50%' },
      { label: 'Leve', range: '< 50%' },
    ],
    referenceInstruments: ['AQ-50', 'RAADS-R', 'CAT-Q', 'QIIAHSD', 'OEQ-II'],
    preSummarization: 'Dossiê Pessoal: pré-sumarização via Haiku antes de qualquer seção personalizada. Condensa campos abertos e qualitativos. 400-600 tokens. Usado como contexto em todas as chamadas de geração.',
  },
  reportList: [
    {
      name: 'Perfil de Compatibilidade com TEA',
      color: '#5b9bd5',
      pages: '~15-20 páginas',
      description: 'Score composto de compatibilidade (0-100) com classificação por faixa (Muito Alta/Alta/Moderada/Baixa). Scores individuais dos 6 domínios TEA com classificação (Intenso/Moderado/Leve). Narrativa personalizada por IA. Seção educacional sobre TEA.',
      sections: ['Capa', 'Institucional', 'Saudação', 'Seção educacional (o que é TEA)', 'Score composto', '6 domínios com narrativa personalizada', 'Dossiê pessoal', 'Próximos passos', 'Disclaimer'],
      status: 'Em desenvolvimento',
    },
    {
      name: 'Perfil de Compatibilidade com AH/SD',
      color: '#8b5cf6',
      pages: '~15-20 páginas',
      description: 'Score composto de compatibilidade (0-100). Scores individuais dos 10 domínios AH/SD. Referências teóricas: Teoria dos Três Anéis (Renzulli), Overexcitabilities (Dabrowski), Assincronia. Narrativa personalizada por IA.',
      sections: ['Capa', 'Institucional', 'Saudação', 'Seção educacional (o que é AH/SD)', 'Score composto', '10 domínios com narrativa personalizada', 'Dossiê pessoal', 'Próximos passos', 'Disclaimer'],
      status: 'Em desenvolvimento',
    },
    {
      name: 'Rastreio de Dupla Excepcionalidade (2e)',
      color: '#6366f1',
      pages: '~10-15 páginas',
      description: 'Score composto 2e (0-100) que cruza indicadores de TEA e AH/SD. 4 domínios específicos de 2e. Análise de como as duas condições interagem e se mascaram mutuamente. Guia de próximos passos para investigação profissional.',
      sections: ['Capa', 'Institucional', 'Saudação', 'Seção educacional (o que é 2e)', 'Score composto', '4 domínios com narrativa', 'Cruzamento TEA×AH/SD', 'Guia de próximos passos', 'Disclaimer'],
      status: 'Pendente',
    },
  ],
  pipeline: [
    { step: 'Formulário', tool: 'Tally' },
    { step: 'Orquestração', tool: 'Make.com' },
    { step: 'Geração texto', tool: 'Claude API Haiku' },
    { step: 'Montagem', tool: 'Templates HTML' },
    { step: 'Conversão PDF', tool: 'PDF.co' },
    { step: 'Entrega', tool: 'Email' },
  ],
  ecosystem: SHARED_ECOSYSTEM,
  links: [
    { label: 'Hotmart', url: 'https://brunosallesphd.com.br' },
  ],
};

const CONTENT_MAP: Record<string, ProductContent> = {
  'mapa-7p': MAPA_CONTENT,
  'guia-rapido': GUIA_RAPIDO_CONTENT,
  'manual-rotina': MANUAL_ROTINA_CONTENT,
  '2as': DUAS_AS_CONTENT,
};

export async function getProductContent(productId: string): Promise<ProductContent | null> {
  return CONTENT_MAP[productId] || null;
}
