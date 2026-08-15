import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertPublicationTransition,
  parseCreatePublicationInput,
  parseCreateReferenceInput,
  parseCreateTemplateInput,
  parseReviewInput,
  parseUpdatePublicationInput,
  sortByNarrativeOrder,
  sortByRealChronology,
} from '../../../supabase/functions/_shared/storyContent.ts';

test('ordem narrativa independe da cronologia real', () => {
  const rows = [
    { narrativeOrder: 2, sourceOccurredAt: '2026-07-24T08:00:00Z', label: 'contexto' },
    { narrativeOrder: 1, sourceOccurredAt: '2026-07-24T09:00:00Z', label: 'gancho' },
    { narrativeOrder: 3, sourceOccurredAt: null, label: 'fechamento' },
  ];
  assert.deepEqual(sortByNarrativeOrder(rows).map(row => row.label), ['gancho', 'contexto', 'fechamento']);
  assert.deepEqual(sortByRealChronology(rows).map(row => row.label), ['contexto', 'gancho', 'fechamento']);
});

test('template exige nome, objetivo e passos estruturais sem HTML', () => {
  const valid = parseCreateTemplateInput({
    name: 'Gancho cotidiano + virada didática',
    objective: 'Transformar uma cena comum em explicação sobre TDAH adulto.',
    description: 'Começa na rotina, encontra a tensão e fecha com orientação prática.',
    tags: ['rotina', 'TDAH'],
    steps: [
      { role: 'hook', instruction: 'Mostrar a cena real em uma frase.' },
      { role: 'development', instruction: 'Explicar o mecanismo sem jargão.' },
      { role: 'closing', instruction: 'Fechar com convite específico.' },
    ],
  });
  assert.equal(valid.name, 'Gancho cotidiano + virada didática');
  assert.equal(valid.tags[1], 'tdah');
  assert.throws(() => parseCreateTemplateInput({ ...valid, objective: '<script>alert(1)</script>' }), /HTML/i);
  assert.throws(() => parseCreateTemplateInput({ ...valid, steps: [] }), /passo/i);
});

test('publicação exige template e pelo menos um story', () => {
  const publication = parseCreatePublicationInput({
    title: 'Treino de manhã',
    templateId: '784fef37-8cc4-4ea1-b79e-8b5094dddc1f',
    scheduledFor: null,
    items: [
      {
        mediaType: 'text',
        textContent: 'Hoje o corpo queria negociar. Fui mesmo assim.',
        narrativeOrder: 1,
        narrativeRole: 'hook',
      },
    ],
  });
  assert.equal(publication.items[0]?.narrativeOrder, 1);
  assert.throws(() => parseCreatePublicationInput({ ...publication, items: [] }), /story/i);
});

test('referência preserva fonte, análise, template e ordem dos stories', () => {
  const reference = parseCreateReferenceInput({
    title: 'Raul Sena, cena, lente e princípio',
    description: 'A cena cotidiana vira autoridade financeira e declaração de princípio.',
    platform: 'instagram',
    sourceAccount: '@investidorsardinha',
    sourceUrl: 'https://www.instagram.com/investidorsardinha/',
    sourceStartedAt: '2026-07-24T08:10:00-03:00',
    sourceEndedAt: '2026-07-24T08:14:00-03:00',
    templateId: '784fef37-8cc4-4ea1-b79e-8b5094dddc1f',
    items: [
      {
        mediaType: 'image',
        assetUrl: 'https://example.com/story-2.jpg',
        textContent: 'Pagamento do loop com humor de nicho.',
        sourceOccurredAt: '2026-07-24T08:12:00-03:00',
        narrativeOrder: 2,
        narrativeRole: 'development',
      },
      {
        mediaType: 'image',
        assetUrl: 'https://example.com/story-1.jpg',
        textContent: 'Cena cotidiana com conflito leve.',
        sourceOccurredAt: '2026-07-24T08:10:00-03:00',
        narrativeOrder: 1,
        narrativeRole: 'hook',
      },
    ],
  });

  assert.equal(reference.sourceAccount, '@investidorsardinha');
  assert.equal(reference.items[0]?.narrativeOrder, 1);
  assert.equal(reference.items[1]?.sourceOccurredAt, '2026-07-24T11:12:00.000Z');
  assert.throws(() => parseCreateReferenceInput({ ...reference, sourceAccount: '' }), /conta/i);
  assert.throws(() => parseCreateReferenceInput({ ...reference, items: [] }), /story/i);
  assert.throws(
    () => parseCreateReferenceInput({ ...reference, sourceEndedAt: '2026-07-24T07:00:00-03:00' }),
    /término/i,
  );
});

test('fluxo editorial exige comentário ao pedir ajustes', () => {
  assert.doesNotThrow(() => assertPublicationTransition('draft', 'pending_approval'));
  assert.doesNotThrow(() => assertPublicationTransition('pending_approval', 'approved'));
  assert.throws(() => assertPublicationTransition('draft', 'published'), /Transição/i);
  assert.throws(() => parseReviewInput({ decision: 'changes_requested', note: '  ' }), /comentário/i);
  assert.equal(parseReviewInput({ decision: 'approved', note: '' }).decision, 'approved');
});

test('edição reaproveita o contrato da publicação e exige a revisão esperada', () => {
  const edited = parseUpdatePublicationInput({
    title: 'Treino de manhã, versão corrigida',
    templateId: '784fef37-8cc4-4ea1-b79e-8b5094dddc1f',
    scheduledFor: null,
    expectedRevision: 2,
    items: [{
      mediaType: 'text',
      assetUrl: null,
      textContent: 'Troquei o fechamento depois do pedido de ajustes.',
      narrativeOrder: 1,
      narrativeRole: 'closing',
    }],
  });
  assert.equal(edited.expectedRevision, 2);
  assert.match(edited.title, /corrigida/);
  assert.throws(
    () => parseUpdatePublicationInput({ ...edited, expectedRevision: 0 }),
    /revisão/i,
  );
});

test('template preserva o dossiê estrutural completo dentro de definition', () => {
  const definition = {
    formula: 'História real → pequena entrega → CTA coerente',
    risks: ['Virar uma sequência genérica', 'Entregar antes de criar tensão'],
    preserveRules: ['Preservar a progressão causal da história'],
    adaptRules: ['Trocar o contexto pela rotina editorial de Bruno'],
    avoidRules: ['Não copiar frases nem identidade visual da referência'],
    moldSteps: [
      { title: 'História', purpose: 'Abrir uma tensão concreta e reconhecível.' },
      { title: 'Pequena entrega', purpose: 'Resolver uma parte útil da tensão.' },
      { title: 'CTA', purpose: 'Convidar para o próximo passo natural.' },
    ],
    steps: [
      { role: 'hook', instruction: 'Contar a história concreta.' },
      { role: 'development', instruction: 'Fazer uma pequena entrega.' },
      { role: 'cta', instruction: 'Fechar com CTA coerente.' },
    ],
  };
  const parsed = parseCreateTemplateInput({
    name: 'História → pequena entrega → CTA',
    objective: 'Transformar uma história em valor aplicado e convite editorial.',
    description: 'Molde integrado ao dossiê de referência.',
    tags: ['história', 'entrega', 'cta'],
    definition,
  }) as unknown as { definition: typeof definition };
  assert.deepEqual(parsed.definition, definition);
});

test('campos ricos do dossiê de template têm limite e rejeitam HTML', () => {
  const base = {
    name: 'História → pequena entrega → CTA',
    objective: 'Transformar história em entrega.',
    description: null,
    tags: [],
    definition: {
      formula: 'História → entrega → CTA',
      risks: ['Não antecipar a conclusão.'],
      preserveRules: ['Preservar causalidade.'],
      adaptRules: ['Adaptar a cena.'],
      avoidRules: ['Evitar cópia literal.'],
      moldSteps: [{ title: 'História', purpose: 'Criar tensão.' }],
      steps: [{ role: 'hook', instruction: 'Abrir com a história.' }],
    },
  };
  assert.throws(
    () => parseCreateTemplateInput({ ...base, definition: { ...base.definition, formula: 'x'.repeat(2_001) } }),
    /formula|caracteres|tamanho/i,
  );
  assert.throws(
    () => parseCreateTemplateInput({ ...base, definition: { ...base.definition, preserveRules: ['<b>copiar a forma</b>'] } }),
    /HTML/i,
  );
});

test('referência preserva análise estruturada da sequência e metadata de evidência por página', () => {
  const analysis = {
    summary: 'Uma história pessoal prepara uma pequena entrega antes do CTA.',
    narrativeArc: ['história', 'pequena entrega', 'cta'],
    whyItWorks: ['A entrega paga a atenção antes do convite.'],
    templateFit: 'Referência canônica para o molde integrado.',
  };
  const metadata = {
    sourcePage: 42,
    canonicalPageUrl: 'https://www.instagram.com/stories/highlights/42',
    canonicalPageAssetUrl: '/story-references/stories-para-enriquecer/page-42.webp',
    evidenceType: 'canonical_page',
    sourceExcerpt: 'Primeiro eu preciso te contar o que aconteceu.',
    analysis: 'A página abre a história e instala a tensão.',
    criticism: 'A abertura depende de contexto que precisa ser encurtado.',
    brunoAdaptation: 'Abrir com uma cena clínica cotidiana, sem expor paciente.',
    editorialStatus: 'approved',
    moldConsequence: 'Preservar uma página inteira para a história antes da entrega.',
  };
  const parsed = parseCreateReferenceInput({
    title: 'Stories para Enriquecer',
    description: 'Referência das páginas 42–46.',
    analysis,
    platform: 'instagram',
    sourceAccount: '@referencia',
    sourceUrl: 'https://www.instagram.com/referencia/',
    sourceStartedAt: null,
    sourceEndedAt: null,
    templateId: '784fef37-8cc4-4ea1-b79e-8b5094dddc1f',
    items: [{
      mediaType: 'image', assetUrl: 'https://example.com/page-42.webp', textContent: 'Abertura da história.',
      sourceOccurredAt: null, narrativeOrder: 1, narrativeRole: 'hook', metadata,
    }],
  }) as unknown as { analysis: typeof analysis; items: Array<{ metadata: typeof metadata }> };
  assert.deepEqual(parsed.analysis, analysis);
  assert.deepEqual(parsed.items[0]?.metadata, metadata);
});

test('dossiê visual preserva quick, visual e deep como camadas independentes', () => {
  const quick = {
    roleLabel: 'Story 1 · Identificação e curiosidade',
    title: 'A cena já contém a pergunta narrativa',
    summary: 'Uma situação cotidiana e comprovável abre uma pergunta antes da decisão.',
    evidence: 'O número específico dá aparência de observação real.',
    audienceEffect: 'A pessoa quer descobrir se Raul troca ou se recusa.',
    subtext: 'A viagem comunica status sem dominar o assunto.',
    funnelFunction: 'Relacionamento e resposta espontânea.',
    extractedRule: 'Comece por uma cena que já contenha a pergunta narrativa.',
  };
  const visual = {
    roleLabel: 'Story 1 · Rosto e contexto',
    title: 'Cena cotidiana com prova visual',
    scene: 'Selfie dentro do avião com uma família ao fundo.',
  };
  const deep = {
    roleLabel: 'Story 1 · Identificação e curiosidade',
    title: 'A cena e o gancho',
    lead: 'Selfie no avião, uma família ao fundo e um dado específico.',
    sections: [{
      title: 'O que ele faz aqui',
      paragraphs: ['A situação cotidiana vira matéria-prima narrativa.'],
      bullets: ['A família comprova a história.', 'O dedo orienta o olhar.'],
    }],
    extractedRule: 'A cena inicial precisa ser específica, discutível e visualmente comprovável.',
  };
  const analysis = {
    synthesis: [{ title: 'Papel de cada story', paragraphs: ['O primeiro abre a pergunta.'] }],
    registeredTemplate: {
      name: 'Cena comum → lente do especialista → valor pessoal',
      steps: [{ title: 'Cena cotidiana', description: 'Abra pela vida real.' }],
    },
    sourceNote: 'Análise produzida a partir dos três prints originais.',
  };
  const input = {
    title: 'Raul Sena, cena → humor → princípio',
    description: 'Referência visual completa.',
    analysis,
    platform: 'instagram',
    sourceAccount: '@_raulsena',
    sourceUrl: 'https://www.instagram.com/_raulsena/',
    sourceStartedAt: null,
    sourceEndedAt: null,
    templateId: '784fef37-8cc4-4ea1-b79e-8b5094dddc1f',
    items: [{
      mediaType: 'image',
      assetUrl: 'https://example.com/story-1.jpg',
      textContent: 'Cena cotidiana com conflito leve.',
      sourceOccurredAt: null,
      narrativeOrder: 1,
      narrativeRole: 'hook',
      metadata: { quick, visual, deep },
    }],
  } as const;

  const parsed = parseCreateReferenceInput(input);
  assert.deepEqual(parsed.items[0]?.metadata?.quick, quick);
  assert.deepEqual(parsed.items[0]?.metadata?.visual, visual);
  assert.deepEqual(parsed.items[0]?.metadata?.deep, deep);
  assert.deepEqual(parsed.analysis, analysis);

  assert.throws(
    () => parseCreateReferenceInput({
      ...input,
      items: [{ ...input.items[0], metadata: { quick: { ...quick, title: '<b>gancho</b>' }, visual, deep } }],
    }),
    /HTML/i,
  );
  assert.throws(
    () => parseCreateReferenceInput({
      ...input,
      items: [{
        ...input.items[0],
        metadata: {
          quick,
          visual,
          deep: { ...deep, sections: Array.from({ length: 13 }, (_, index) => ({ title: `Seção ${index + 1}` })) },
        },
      }],
    }),
    /seç|tamanho/i,
  );
  assert.throws(
    () => parseCreateReferenceInput({
      ...input,
      analysis: {
        ...analysis,
        synthesis: Array.from({ length: 21 }, (_, index) => ({ title: `Síntese ${index + 1}`, paragraphs: [] })),
      },
    }),
    /síntese|tamanho/i,
  );
  assert.throws(
    () => parseCreateReferenceInput({
      ...input,
      analysis: {
        ...analysis,
        registeredTemplate: {
          ...analysis.registeredTemplate,
          steps: Array.from({ length: 9 }, (_, index) => ({ title: `Passo ${index + 1}`, description: 'Descrição.' })),
        },
      },
    }),
    /registrado|passo|tamanho/i,
  );
});

test('dossiê do Raul preserva raio-X visual, análise completa e placeholders sem contaminar o contrato base', () => {
  const definition = {
    formula: 'Cena real → lente do especialista → princípio pessoal',
    preserveRules: ['Preservar a função de cada tela.'],
    adaptRules: ['Adaptar cenário, roupa e prova.'],
    avoidRules: ['Evitar copiar a superfície da referência.'],
    moldSteps: [{
      title: 'Cena e gancho',
      purpose: 'Abrir uma pergunta comprovada pela cena.',
      fixedFunction: 'Comprovar a cena e abrir uma pergunta.',
      placeholders: [
        { kind: 'copy', label: 'Gancho específico' },
        { kind: 'scene', label: 'Cena real reconhecível' },
        { kind: 'person', label: 'Rosto ou pessoa' },
        { kind: 'reaction', label: 'Resposta espontânea' },
      ],
    }],
    steps: [{ role: 'hook', instruction: 'Abrir com uma cena real.' }],
  } as const;
  const visual = {
    roleLabel: 'Story 1 · Rosto e contexto',
    title: 'Cena cotidiana com prova visual',
    scene: 'Selfie dentro do avião com uma família ao fundo.',
    typography: 'Texto branco serifado sobre caixa preta.',
    composition: 'Texto no alto, rosto como massa principal e gesto em diagonal.',
    palette: ['#111315', '#e9e5da'],
    impression: 'Proximidade e espontaneidade.',
    markers: [
      { label: '1', description: 'O dedo orienta o olhar para o fundo.' },
      { label: '2', description: 'A família comprova visualmente a história.' },
    ],
  };
  const analysis = {
    summary: 'Uma cena cotidiana vira princípio de posicionamento.',
    overview: ['A autoridade aparece dentro da maneira como Raul interpreta a situação.'],
    sequenceMap: [{ label: '1 · Gancho', value: 'Identificação + curiosidade' }],
    visualGrammar: 'Rosto → gráfico → print, sempre dentro do avião.',
    productRevealed: 'Uma persona financeiramente racional.',
    transferRules: ['Começar pela vida real, sem anunciar uma aula.'],
  };
  const analysisSections = [{
    title: 'O que ele faz aqui',
    paragraphs: ['A cena instala uma pergunta narrativa.'],
    bullets: ['Usa uma situação reconhecível.', 'Comprova a história visualmente.'],
  }];
  const parsedTemplate = parseCreateTemplateInput({
    name: 'Cena → lente → princípio',
    objective: 'Transformar rotina em posicionamento.',
    description: 'Dossiê visual do Raul.',
    tags: ['raul'],
    definition,
  });
  const parsedReference = parseCreateReferenceInput({
    title: 'Raul Sena, cena → humor → princípio',
    description: 'Referência visual completa.',
    analysis,
    platform: 'instagram',
    sourceAccount: '@_raulsena',
    sourceUrl: 'https://www.instagram.com/_raulsena/',
    sourceStartedAt: null,
    sourceEndedAt: null,
    templateId: '784fef37-8cc4-4ea1-b79e-8b5094dddc1f',
    items: [{
      mediaType: 'image',
      assetUrl: 'https://example.com/story-1.jpg',
      textContent: 'Cena cotidiana com conflito leve.',
      sourceOccurredAt: null,
      narrativeOrder: 1,
      narrativeRole: 'hook',
      metadata: {
        sourceExcerpt: 'Uma vez a cada aproximadamente 10 voos...',
        analysis: 'O número específico dá aparência de observação real.',
        audienceEffect: 'A frase para antes da decisão.',
        subtext: 'A viagem comunica status sem virar o assunto.',
        funnelFunction: 'Relacionamento.',
        extractedRule: 'Comece por uma cena banal e comprovável.',
        analysisSections,
        visual,
      },
    }],
  });

  assert.deepEqual(parsedTemplate.definition, definition);
  assert.deepEqual(parsedReference.analysis, analysis);
  assert.deepEqual(parsedReference.items[0]?.metadata?.analysisSections, analysisSections);
  assert.deepEqual(parsedReference.items[0]?.metadata?.visual, visual);
  assert.throws(
    () => parseCreateTemplateInput({
      ...parsedTemplate,
      definition: {
        ...definition,
        moldSteps: [{ ...definition.moldSteps[0], placeholders: [{ kind: 'invalid', label: 'x' }] }],
      },
    }),
    /placeholder/i,
  );
  assert.throws(
    () => parseCreateReferenceInput({
      ...parsedReference,
      items: [{
        ...parsedReference.items[0],
        metadata: { visual: { ...visual, palette: ['red'] } },
      }],
    }),
    /cor|paleta/i,
  );
});
