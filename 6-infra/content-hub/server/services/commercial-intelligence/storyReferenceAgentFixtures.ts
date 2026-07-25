const sha256 = (character: string) => character.repeat(64);

export function createAgentReferenceFixture() {
  const items = Array.from({ length: 4 }, (_, index) => {
    const narrativeOrder = index + 1;
    return {
      mediaType: 'image',
      textContent: `Texto original do story ${narrativeOrder}.`,
      sourceOccurredAt: null,
      narrativeOrder,
      narrativeRole: narrativeOrder === 1 ? 'hook' : narrativeOrder === 4 ? 'closing' : 'development',
      metadata: {
        quick: {
          roleLabel: `Papel rápido ${narrativeOrder}`,
          title: `Leitura rápida ${narrativeOrder}`,
          summary: `Resumo rápido ${narrativeOrder}.`,
          evidence: `Evidência concreta ${narrativeOrder}.`,
          audienceEffect: `Efeito no público ${narrativeOrder}.`,
          subtext: `Subtexto ${narrativeOrder}.`,
          funnelFunction: `Função no funil ${narrativeOrder}.`,
          extractedRule: `Regra rápida ${narrativeOrder}.`,
        },
        visual: {
          roleLabel: `Papel visual ${narrativeOrder}`,
          title: `Raio-X visual ${narrativeOrder}`,
          scene: `Cena ${narrativeOrder}.`,
          typography: `Tipografia ${narrativeOrder}.`,
          composition: `Composição ${narrativeOrder}.`,
          graphic: `Elemento gráfico ${narrativeOrder}.`,
          palette: ['#102f26', '#f6f1e7', '#9e1b32'],
          impression: `Sensação transmitida ${narrativeOrder}.`,
          markers: [{ label: `${narrativeOrder}`, description: `Marcador ${narrativeOrder}.` }],
        },
        deep: {
          roleLabel: `Papel detalhado ${narrativeOrder}`,
          title: `Análise detalhada ${narrativeOrder}`,
          lead: `Leitura aprofundada ${narrativeOrder}.`,
          sections: [{
            title: `Mecanismo ${narrativeOrder}`,
            paragraphs: [`Parágrafo aprofundado ${narrativeOrder}.`],
            bullets: [`Evidência aprofundada ${narrativeOrder}.`],
          }],
          extractedRule: `Regra detalhada ${narrativeOrder}.`,
        },
      },
    };
  });

  return {
    referenceKey: 'instagram-bruno-2026-07-24-sequencia-001',
    contentHash: sha256('a'),
    template: {
      canonicalKey: 'cena-real-lente-especialista-principio',
      name: 'Cena real → lente do especialista → princípio',
      objective: 'Transformar uma situação reconhecível em posicionamento.',
      description: 'A cena abre uma tensão, a lente muda o significado e o fechamento revela um princípio.',
      tags: ['story', 'referência'],
      definition: {
        editorialName: 'Cena real → lente → princípio',
        editorialSummary: 'Uma situação cotidiana ganha significado pela leitura do especialista.',
        formula: 'Cena real → interpretação → prova → princípio',
        preserveRules: ['Preservar a função narrativa de cada tela.'],
        adaptRules: ['Adaptar cenário, voz e prova ao Bruno.'],
        avoidRules: ['Não copiar a superfície da referência.'],
        moldSteps: [
          {
            title: 'Cena e gancho',
            purpose: 'Abrir uma pergunta narrativa.',
            fixedFunction: 'Mostrar uma situação real e específica.',
            placeholders: [{ kind: 'scene', label: 'Cena reconhecível' }],
          },
          {
            title: 'Lente do especialista',
            purpose: 'Reinterpretar a cena.',
            fixedFunction: 'Adicionar repertório sem interromper a história.',
            placeholders: [{ kind: 'proof', label: 'Dado ou prova visual' }],
          },
          {
            title: 'Resposta e princípio',
            purpose: 'Revelar como o criador pensa.',
            fixedFunction: 'Fechar com um princípio transferível.',
            placeholders: [{ kind: 'principle', label: 'Princípio pessoal' }],
          },
        ],
        steps: [
          { role: 'hook', instruction: 'Mostrar uma cena específica.' },
          { role: 'development', instruction: 'Aplicar a lente do especialista.' },
          { role: 'closing', instruction: 'Fechar com um princípio.' },
        ],
      },
      steps: [
        { role: 'hook', instruction: 'Mostrar uma cena específica.' },
        { role: 'development', instruction: 'Aplicar a lente do especialista.' },
        { role: 'closing', instruction: 'Fechar com um princípio.' },
      ],
    },
    reference: {
      title: 'Uma cena comum que revela um princípio',
      description: 'Dossiê completo de uma sequência genérica com quatro stories.',
      analysis: {
        summary: 'A sequência transforma uma cena comum em posicionamento.',
        overview: ['A curiosidade nasce da cena e termina em uma regra pessoal.'],
        narrativeArc: ['cena', 'interpretação', 'prova', 'princípio'],
        whyItWorks: ['Muda o estímulo sem abandonar a mesma história.'],
        templateFit: 'A sequência cumpre as três funções do template.',
        sequenceMap: [
          { label: '1 · Gancho', value: 'Cena e curiosidade' },
          { label: '2 · Lente', value: 'Interpretação' },
          { label: '3 · Prova', value: 'Evidência' },
          { label: '4 · Fechamento', value: 'Princípio' },
        ],
        visualGrammar: 'A hierarquia visual muda junto com a função narrativa.',
        productRevealed: 'Uma persona próxima, criteriosa e coerente.',
        transferRules: ['Preservar a função e adaptar a superfície.'],
        synthesis: [{
          title: 'Leitura transversal',
          paragraphs: ['A sequência progride por mudança de estímulo e continuidade temática.'],
        }],
        registeredTemplate: {
          name: 'Cena real → lente do especialista → princípio',
          steps: [
            { title: 'Cena', description: 'Abrir a pergunta.' },
            { title: 'Lente', description: 'Mudar o significado.' },
            { title: 'Princípio', description: 'Revelar posicionamento.' },
          ],
        },
        sourceNote: 'Sequência confirmada e analisada em ordem narrativa.',
      },
      platform: 'instagram',
      sourceAccount: '@bruno',
      sourceUrl: 'https://www.instagram.com/bruno/',
      sourceStartedAt: '2026-07-24T12:00:00.000Z',
      sourceEndedAt: '2026-07-24T12:05:00.000Z',
      items,
    },
    assets: items.map(item => ({
      narrativeOrder: item.narrativeOrder,
      fileName: `story-${item.narrativeOrder}.jpg`,
      sha256: sha256(String(item.narrativeOrder)),
      mimeType: 'image/jpeg',
      sizeBytes: 125_000 + item.narrativeOrder,
    })),
  };
}

