---
name: canonical-story-dossier-contract
version: "1.0"
status: active
golden_fixture: raul-sena
---

# Contrato canônico de dossiês de stories

Este documento é a fonte editorial compartilhada pelas skills
`story-sequence-template-analysis` e `catalog-story-reference`.

O JSON Schema ao lado deste arquivo governa forma, tipos, campos obrigatórios e
enumerações. Este documento governa significado, distribuição da análise entre
camadas e critérios editoriais.

## Regra central

Todo dossiê novo destinado à plataforma usa `dossierContractVersion: "1.0"` e
preserva quatro camadas inseparáveis:

1. modo rápido;
2. raio-X visual;
3. molde 9:16;
4. análise aprofundada.

A camada rápida navega. A camada aprofundada é o registro canônico. Nenhuma
compactação de interface autoriza descartar evidências ou substituir a análise
por um resumo genérico.

## Proveniência

Antes de analisar:

- confirmar que a sequência terminou;
- preservar a ordem narrativa;
- registrar quem confirmou a completude;
- distinguir o que está visível, informado, pesquisado, inferido ou ilegível;
- usar `metadata.sourceExcerpt` para texto legível;
- usar `metadata.noSourceTextReason` somente quando não houver texto-fonte
  aplicável ou ele estiver integralmente ilegível.

Nunca completar um trecho por plausibilidade.

## Camadas por story

### Rápida

`metadata.quick` responde:

- qual é o papel da tela;
- qual leitura deve aparecer no modo rápido;
- qual evidência concreta sustenta a leitura;
- qual efeito produz no público;
- qual subtexto comunica;
- qual função cumpre no funil;
- qual regra reutilizável nasce da tela.

### Visual

`metadata.visual` registra:

- cena, ambiente, pessoa, expressão, gesto e roupa quando visíveis;
- captura e enquadramento;
- texto, posição, alinhamento, contraste e tratamento tipográfico;
- composição e direção do olhar;
- gráfico, print, sticker, enquete, reação, objeto ou prova;
- paleta;
- impressão transmitida;
- marcadores ligados ao print quando úteis;
- relação visual com as telas anterior e seguinte.

### Aprofundada

`metadata.deep.sections` desenvolve a análise sem repetir mecanicamente as
camadas anteriores. Cada seção declara `covers`.

Dimensões centrais:

- `evidence`;
- `attention`;
- `narrative`;
- `continuity`;
- `funnel`;
- `subtext`;
- `template-consequence`.

Dimensões contextuais:

- `interaction`;
- `critique`.

As contextuais usam `present`, `not-applicable` ou `unknown`, sempre com
justificativa. `narrative` e `continuity` precisam aparecer explicitamente em
`deep.sections[].covers`.

Cobertura automática mínima:

- `quick.evidence` cobre `evidence`;
- `visual.composition` ou `visual.markers` cobre `attention` estruturalmente;
- `quick.funnelFunction` cobre `funnel`;
- `quick.subtext` cobre `subtext`;
- `quick.extractedRule` cobre `template-consequence`;
- seções aprofundadas cobrem somente dimensões declaradas com conteúdo.

O validador prova presença e consistência. O agente prova fidelidade olhando a
fonte.

## Leitura transversal

A análise da sequência contém:

- resumo e leitura geral;
- arco narrativo;
- motivo pelo qual funciona;
- aderência ao template;
- mapa com uma entrada por story e uma entrada `product`;
- gramática visual;
- produto aparente;
- produto estratégico;
- persona construída quando aplicável;
- regras de transferência;
- nota de fonte e limitações.

A síntese contém exatamente estas chaves:

1. `screen-roles`;
2. `stimulus-change`;
3. `aesthetics-production`;
4. `strengths-limitations`.

Os títulos podem variar. As chaves não.

## Template e molde

`reference.analysis.registeredTemplate.steps` é a fonte canônica dos movimentos
conceituais. Cada movimento possui:

- `id`;
- título e descrição;
- mecanismo;
- condição;
- resultado esperado;
- `evidenceStoryOrders`.

`template.definition.moldSteps` é a projeção visual. Cada tela do molde possui
`id` e `templateStepIds`.

Movimentos e telas não precisam ter a mesma cardinalidade. Quatro movimentos
conceituais podem ocupar três stories. Todo movimento, porém, precisa estar
ligado a ao menos uma tela do molde.

`template.steps` e `template.definition.steps` são projeções legadas. Elas não
podem introduzir interpretação concorrente.

O molde termina com regras específicas de preservar, adaptar e evitar.

## Validação

Erros bloqueiam antes de qualquer rede:

- versão ausente ou incorreta;
- camada obrigatória ausente;
- dimensão central sem cobertura;
- avaliação contextual sem justificativa;
- mapa sem stories ordenados ou sem produto real;
- síntese sem as quatro chaves;
- template formado só por rótulos;
- movimento sem evidência ou sem tela de molde;
- placeholder sem função;
- asset sem correspondência;
- títulos idênticos nas três camadas;
- camadas integralmente duplicadas.
