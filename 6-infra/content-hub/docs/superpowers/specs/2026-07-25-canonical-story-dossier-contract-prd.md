---
artifact: prd
version: "1.1"
created: 2026-07-25
status: reviewed
---

# PRD: Contrato canônico de dossiês de stories

## 1. Visão geral

### 1.1 Problema

A Biblioteca de stories possui uma referência de alta fidelidade, o dossiê de
Raul Sena, mas essa qualidade ainda não está transformada em um contrato
executável para novas análises.

As skills atuais descrevem a necessidade de preservar as camadas rápida,
visual e aprofundada. O publicador, porém, verifica principalmente a presença
de objetos e listas não vazias. Ele não comprova se:

- cada conclusão está ancorada em texto ou evidência visual da tela;
- a análise cobre narrativa, continuidade, interação, funil, subtexto e crítica;
- a leitura transversal preserva os quatro eixos usados no dossiê de Raul;
- o produto real aparece no modo rápido;
- o template extraído contém mecanismos operacionais, e não apenas rótulos;
- o conteúdo detalhado utiliza a arquitetura visual prevista pela plataforma.

Essa lacuna permitiu que o dossiê `Efeito Espelho` fosse publicado com todos os
objetos técnicos necessários, mas com menor fidelidade editorial e pior
distribuição da informação do que a referência de Raul.

O problema não é falta de texto. É falta de um padrão verificável que distinga
prosa extensa de análise completa.

### 1.2 Por que agora

A biblioteca começará a receber novas sequências com frequência. Corrigir cada
referência depois da publicação cria retrabalho, revisões desnecessárias e
inconsistência entre templates. O padrão precisa ser estabelecido antes de
ampliar o catálogo.

### 1.3 Solução resumida

Criar um contrato canônico, versionado e testável para dossiês de stories,
usando o dossiê de Raul Sena como referência dourada de arquitetura.

O contrato será compartilhado por:

1. skill de análise;
2. skill de catalogação;
3. payload JSON;
4. validador local;
5. parser da plataforma;
6. componentes de apresentação;
7. testes estruturais e visuais.

O validador recusará um dossiê incompleto antes de qualquer upload ou operação
remota. A referência dourada define a arquitetura, não o tamanho do texto, o
assunto, o número exato de seções ou a estética superficial.

### 1.4 Usuários

- Bruno, que consulta, compara e reutiliza referências.
- Hermes e Codex, que analisam e catalogam novas sequências.
- Mantenedores da Inteligência Comercial, que evoluem contrato e interface.

## 2. Princípios do produto

### 2.1 Evidência antes da interpretação

Toda conclusão relevante deve indicar o elemento textual ou visual que a
sustenta. Quando a fonte não permitir uma conclusão, o dossiê deve registrar a
limitação em vez de completar a lacuna por plausibilidade.

### 2.2 Análise aprofundada é o registro canônico

O modo rápido organiza a navegação. Ele não substitui, resume de forma
destrutiva nem limita a análise aprofundada.

### 2.3 Compactação é uma decisão de interface

A interface pode usar seletores, âncoras e expansão progressiva. Nenhum desses
recursos autoriza eliminar evidências, críticas ou consequências para o molde.

### 2.4 Arquitetura fixa, conteúdo flexível

As dimensões analíticas são obrigatórias. Seus títulos, tamanho e agrupamento
podem variar conforme a referência.

O contrato não exigirá uma quantidade arbitrária de caracteres ou exatamente
o mesmo número de seções do Raul. Ele exigirá cobertura explícita das
dimensões e ligação com a evidência.

### 2.5 Referência, template e aplicação continuam separados

- A referência preserva o que ocorreu na sequência-fonte.
- O template abstrai mecanismos reutilizáveis.
- A aplicação traduz o template para uma situação do Bruno.
- A publicação registra uma execução real.

Esses objetos podem aparecer juntos no dossiê, mas não podem ser sobrescritos
uns pelos outros.

## 3. Objetivos e métricas

### 3.1 Objetivos

1. Fazer toda nova referência publicada pelo Hermes seguir a arquitetura do
   dossiê de Raul.
2. Impedir que payloads editorialmente rasos cheguem à rede.
3. Manter flexibilidade suficiente para sequências com outros temas, formatos e
   quantidades de telas.
4. Preservar referências existentes e permitir correções revisionais,
   reversíveis e isoladas.
5. Tornar as regras compreensíveis tanto para agentes quanto para testes
   determinísticos.

### 3.2 Métricas de aceite

| Métrica | Baseline | Meta |
| --- | --- | --- |
| Fixture dourada do Raul aprovada | Não existe como teste integral do publicador | 100% |
| Fixtures rasas rejeitadas antes da rede | Parcial | 100% |
| Stories com cobertura das dimensões obrigatórias | Não mensurado | 100% das novas publicações pelo Hermes |
| Dossiês novos com rápido, raio-X, molde e aprofundamento | Validação apenas de presença | 100% com cobertura validada |
| Chamadas de rede durante validação inválida | Não garantido por teste editorial | 0 |
| Regressões no Raul e no template História → pequena entrega → CTA | Risco manual | 0 |

### 3.3 Não objetivos

- Uniformizar o estilo de escrita de todos os creators.
- Exigir o mesmo número de stories, seções, bullets ou caracteres do Raul.
- Copiar a estética, o assunto ou as frases da referência dourada.
- Criar agora um editor visual de dossiês na plataforma.
- Corrigir retroativamente todas as referências existentes.
- Alterar o conteúdo ou a identidade do dossiê de Raul.
- Alterar `História → pequena entrega → CTA` ou `Stories para Enriquecer`.
- Publicar a correção do Efeito Espelho sem autorização remota específica.
- Usar um segundo modelo de IA como juiz automático de qualidade.

## 4. Referência dourada

### 4.1 Baseline

O baseline canônico é a combinação de:

- conteúdo persistido pela migration
  `20260725013000_ci_raul_sena_dossier_fidelity.sql`;
- especificação
  `2026-07-24-raul-sena-dossier-fidelity-rebuild-design.md`;
- renderização desktop e mobile registrada em
  `docs/commercial-intelligence/evidence/raul-dossier-fidelity/`;
- comportamento atual do dossiê autenticado na Biblioteca de stories.

### 4.2 O que a referência dourada governa

O Raul governa:

- separação entre modo rápido, raio-X, molde e análise aprofundada;
- proximidade entre print e interpretação;
- mapa da sequência com produto real;
- análise individual por tela;
- leitura transversal em módulos escaneáveis;
- extração do template;
- alternância visual das telas no aprofundamento;
- preservação de evidência e crítica.

O Raul não governa:

- tema;
- creator;
- quantidade de telas;
- texto dos títulos;
- número rígido de parágrafos;
- paleta;
- tipo de CTA;
- presença obrigatória de uma resposta do público.

## 5. Contrato canônico

Todo payload novo do Hermes incluirá `dossierContractVersion`. A primeira versão
será `1.0`.

### 5.1 Identidade e proveniência

Campos obrigatórios:

- identidade estável da referência;
- creator ou conta-fonte;
- plataforma;
- ordem narrativa contínua;
- confirmação de completude da sequência;
- datas e URL quando conhecidas;
- nota de proveniência quando a data, ordem ou continuidade for inferida;
- asset original para cada item visual.

O dossiê deve distinguir:

- verificado na captura;
- informado por Bruno;
- pesquisado externamente;
- inferido;
- não verificável.

### 5.2 Camada rápida por story

A camada `metadata.quick` de cada item deve oferecer:

- `roleLabel`;
- `title`;
- `summary`;
- `evidence`;
- `audienceEffect`;
- `subtext`;
- `funnelFunction`;
- `extractedRule`.

O trecho-fonte continua armazenado em `metadata.sourceExcerpt`, e a justificativa
de ausência em `metadata.noSourceTextReason`. Eles são exibidos na camada
rápida, mas não serão duplicados dentro de `metadata.quick`.

Regras:

- `sourceExcerpt` preserva palavras, números e detalhes importantes;
- trecho ilegível deve ser marcado como ilegível, nunca completado;
- `summary`, `evidence`, `audienceEffect` e `subtext` não podem repetir a mesma
  frase;
- a regra extraída descreve um mecanismo reutilizável, não o assunto original.

### 5.3 Raio-X visual por story

Cada item visual deve oferecer:

- papel visual;
- título visual;
- cena e ambiente;
- pessoa, expressão, gesto e roupa, quando visíveis;
- tipo de captura e enquadramento;
- texto, posição, alinhamento, contraste e tratamento tipográfico;
- composição e direção do olhar;
- gráfico, print, sticker, enquete, reação, objeto ou prova visual;
- paleta dominante;
- impressão transmitida;
- marcadores vinculados ao print, quando úteis;
- relação visual com as telas anterior e seguinte.

Quando uma dimensão não existir, registrar explicitamente a ausência relevante.
Campo vazio não será usado para ocultar uma análise não realizada.

### 5.4 Análise aprofundada por story

Cada seção aprofundada terá:

- `title`;
- `paragraphs` e/ou `bullets`;
- `covers`, uma lista das dimensões que a seção responde.

A cobertura é calculada sobre o item canônico inteiro, combinando `quick`,
`visual` e `deep`. Ela não exige que a análise aprofundada repita campos já
explicados adequadamente no modo rápido ou no raio-X.

Dimensões centrais obrigatórias por story:

| Chave | Pergunta respondida |
| --- | --- |
| `evidence` | Que palavra, imagem, gesto, objeto ou dado sustenta a leitura? |
| `attention` | O que captura ou preserva a atenção? |
| `narrative` | Qual é a função desta tela na história? |
| `continuity` | Como ela paga a anterior e prepara a seguinte? |
| `funnel` | Que papel cumpre na relação, autoridade, consideração ou conversão? |
| `subtext` | O que comunica sem declarar diretamente? |
| `template-consequence` | O que essa evidência muda ou exige no template e no molde? |

Duas dimensões são contextuais e precisam ser avaliadas, mas podem ser marcadas
como não aplicáveis:

| Chave | Pergunta respondida |
| --- | --- |
| `interaction` | Que participação explícita ou implícita é solicitada? |
| `critique` | Quais limitações, riscos ou inferências frágeis existem nesta tela? |

Cada dimensão contextual terá `status` igual a `present`, `not-applicable` ou
`unknown`, acompanhado de justificativa. A crítica transversal da sequência
continua obrigatória mesmo quando uma tela isolada não apresenta limitação
relevante.

A camada `quick` normalmente cobre evidência, efeito, funil e subtexto. A
camada `visual` cobre evidência visual e atenção. A camada `deep` deve expandir
principalmente função narrativa, continuidade, mecanismos específicos e
consequência para o template. Uma seção pode cobrir mais de uma dimensão sem
precisar repetir o mesmo texto.

A contagem determinística de cobertura usa este mapeamento mínimo:

- `quick.evidence` cobre `evidence`;
- `visual.scene`, `visual.typography`, `visual.graphic` e `visual.markers` podem
  reforçar `evidence`;
- `visual.composition` ou `visual.markers` cobre `attention` estruturalmente
  quando o campo está preenchido; a revisão visual confirma se o conteúdo
  realmente explica a hierarquia do olhar;
- `quick.funnelFunction` cobre `funnel`;
- `quick.subtext` cobre `subtext`;
- `quick.extractedRule` cobre `template-consequence`;
- `deep.sections[].covers` cobre as dimensões declaradas somente quando a seção
  possui conteúdo;
- `deep.dimensionAssessments` registra `interaction` e `critique`.

`narrative` e `continuity` precisam aparecer em `deep.sections[].covers`, pois
não possuem substituto automático na camada rápida.

O validador verifica presença, marcação e consistência estrutural. A revisão
visual verifica se a alegação realmente corresponde ao print.

Cada story também terá:

- papel narrativo;
- título analítico;
- lead;
- regra extraída.

### 5.5 Leitura da sequência

A referência deve conter:

- resumo;
- leitura geral;
- arquitetura narrativa em uma linha;
- mapa com uma entrada por story;
- entrada adicional para o produto real;
- arco e progressão emocional;
- loop aberto e pagamento;
- mudança de estímulo;
- gramática visual;
- produto aparente;
- produto estratégico;
- persona ou posição construída, quando aplicável;
- regras de transferência para Bruno;
- nota de fonte e limites.

### 5.6 Síntese transversal

A síntese será composta por quatro módulos canônicos:

1. `screen-roles`: papel de cada tela;
2. `stimulus-change`: mudança de estímulo e ritmo;
3. `aesthetics-production`: estética, captura e produção;
4. `strengths-limitations`: forças, limitações e dependências.

Os títulos editoriais podem variar. A chave canônica não.

O produto real permanece em um bloco próprio e não pode ficar escondido dentro
de um dos quatro módulos.

### 5.7 Template registrado

O template extraído deve conter:

- nome humano curto e memorável;
- fórmula de 3 a 6 movimentos conceituais;
- situação de uso;
- função principal;
- etapas operacionais;
- elementos obrigatórios;
- elementos opcionais;
- riscos de execução;
- capturas ou insumos necessários;
- adaptação para Bruno;
- vínculo entre cada etapa e a evidência que a originou.

Cada etapa terá um `id` estável dentro do template.

Uma etapa precisa descrever uma transformação ou função. Rótulos isolados como
`identificação`, `conteúdo` ou `CTA` não são suficientes sem mecanismo,
condição e resultado esperado.

No contrato `1.0`, `reference.analysis.registeredTemplate.steps` é a fonte
canônica dos movimentos conceituais. `template.definition.moldSteps` é a
projeção visual desses movimentos e usa `templateStepIds` para declarar a
relação.

Os campos legados `template.steps` e `template.definition.steps` continuam
existindo para compatibilidade, mas são projeções operacionais, não novas fontes
editoriais. Eles podem ter cardinalidade diferente dos movimentos conceituais,
desde que não contradigam sua ordem, função ou resultado. O validador deve
detectar divergência entre essas representações.

### 5.8 Molde 9:16

O molde deve conter uma tela funcional por etapa visual da sequência, com:

- `id`;
- `templateStepIds`, relacionando a tela a um ou mais movimentos conceituais;
- título;
- propósito;
- função fixa;
- placeholders posicionais;
- pelo menos um placeholder de mensagem;
- pelo menos um placeholder de evidência, cena ou prova;
- interação ou continuação quando aplicável.

Movimento conceitual e tela visual não têm cardinalidade obrigatoriamente igual.
Uma sequência pode ter cinco movimentos distribuídos em três stories. Todo
movimento conceitual deve aparecer em ao menos uma tela do molde, e uma tela
pode realizar vários movimentos.

O conjunto termina com:

- preservar;
- adaptar;
- evitar.

Cada regra deve ser específica o suficiente para orientar uma execução sem
copiar a superfície da referência.

### 5.9 Forma aditiva dos novos campos

Os campos normalizados serão adicionados sem reinterpretar os campos legados.
O trecho abaixo ilustra apenas os campos aditivos e suas relações; ele não é um
payload publicável completo. O template integral de payload definido no FR-4
continua sendo a fixture operacional:

```json
{
  "dossierContractVersion": "1.0",
  "template": {
    "definition": {
      "moldSteps": [
        {
          "id": "mold-opening",
          "templateStepIds": ["step-identification"],
          "title": "Abertura visual",
          "purpose": "Instalar a situação e a pergunta narrativa",
          "fixedFunction": "Abrir identificação antes da explicação",
          "placeholders": [
            {"kind": "scene", "label": "Cena reconhecível"},
            {"kind": "copy", "label": "Pergunta específica"}
          ]
        }
      ]
    }
  },
  "reference": {
    "sequenceConfirmed": true,
    "sequenceConfirmationSource": "Confirmada explicitamente por Bruno",
    "analysis": {
      "apparentProduct": "Assunto ou entrega visível",
      "productRevealed": "Produto estratégico da sequência",
      "personaConstructed": "Persona ou posição construída, quando aplicável",
      "sequenceMap": [
        {
          "kind": "story",
          "storyOrder": 1,
          "label": "Gancho",
          "value": "Função concreta da tela"
        },
        {
          "kind": "product",
          "label": "Produto real",
          "value": "Resultado estratégico da sequência"
        }
      ],
      "synthesis": [
        {
          "key": "screen-roles",
          "title": "Papel de cada tela",
          "paragraphs": ["Leitura transversal"]
        },
        {
          "key": "stimulus-change",
          "title": "Mudança de estímulo",
          "paragraphs": ["Ritmo e continuidade"]
        },
        {
          "key": "aesthetics-production",
          "title": "Estética e produção",
          "paragraphs": ["Captura, composição e acabamento"]
        },
        {
          "key": "strengths-limitations",
          "title": "Forças e limitações",
          "paragraphs": ["Potências, riscos e dependências"]
        }
      ],
      "registeredTemplate": {
        "name": "Nome memorável",
        "formula": "movimento -> movimento -> movimento",
        "useWhen": "Condição de uso",
        "primaryFunction": "Função principal",
        "requiredElements": ["Elemento obrigatório"],
        "optionalElements": ["Elemento opcional"],
        "executionRisks": ["Risco"],
        "steps": [
          {
            "id": "step-identification",
            "title": "Nome da etapa",
            "description": "Resumo editorial exibido na análise",
            "mechanism": "Como funciona",
            "condition": "O que precisa existir",
            "expectedResult": "O que produz"
          }
        ]
      }
    },
    "items": [
      {
        "metadata": {
          "sourceExcerpt": "Trecho original ou transcrição fiel",
          "noSourceTextReason": null,
          "deep": {
            "dimensionAssessments": {
              "interaction": {
                "status": "present",
                "rationale": "A enquete solicita uma resposta explícita"
              },
              "critique": {
                "status": "not-applicable",
                "rationale": "Nenhuma limitação específica adicional nesta tela"
              }
            },
            "sections": [
              {
                "title": "Título editorial",
                "covers": ["evidence", "narrative"],
                "paragraphs": ["Análise ancorada na tela"],
                "bullets": []
              }
            ]
          }
        }
      }
    ]
  }
}
```

Regras de compatibilidade:

- `productRevealed` continua sendo string e representa o produto estratégico;
- `apparentProduct` e `personaConstructed` são aditivos;
- `sequenceMap.kind`, `sequenceMap.storyOrder`, `synthesis.key` e
  `deep.sections.covers` são obrigatórios apenas no contrato `1.0`;
- `noSourceTextReason` só pode ser usado quando `sourceExcerpt` não se aplica;
- `sequenceConfirmed` deve ser `true`, e `sequenceConfirmationSource` registra
  quem ou qual evidência confirmou a completude;
- `registeredTemplate.steps[].id` identifica o movimento conceitual;
- `moldSteps[].templateStepIds` referencia esses identificadores;
- `template.steps` e `template.definition.steps` permanecem projeções legadas e
  não podem introduzir uma interpretação concorrente;
- o parser legado continua aceitando os formatos anteriores fora do publicador
  estrito do Hermes.

## 6. Requisitos funcionais

### FR-1: Fonte canônica versionada

O repositório deve conter o contrato editorial e um schema legível por máquina.
As responsabilidades são:

- JSON Schema: autoridade para forma, tipos, obrigatoriedade e enums;
- contrato Markdown: autoridade para significado editorial, exemplos e regras
  de interpretação;
- validador Python: consumidor do schema e executor das regras cruzadas
  identificadas pelo contrato.

O Python não manterá uma segunda enumeração independente dos campos canônicos.
Testes de paridade confirmarão que schema, versão declarada, regras documentadas
e fixtures estão sincronizados.

As skills instaladas no Hermes serão artefatos derivados dessa fonte, não
cópias editadas apenas no WSL. A instalação registrará versão e hash, e um smoke
local confirmará que a cópia ativa corresponde ao repositório.

### FR-2: Skill de análise

`story-sequence-template-analysis` deve:

- ler o contrato canônico antes de produzir um dossiê destinado à plataforma;
- usar um template de saída que represente todas as camadas;
- citar o Raul como fixture de calibração, não apenas como exemplo narrativo;
- produzir `covers` para as seções aprofundadas;
- executar uma checagem de cobertura antes do handoff;
- impedir catalogação quando a sequência não estiver confirmada.

### FR-3: Skill de catalogação

`catalog-story-reference` deve:

- exigir `dossierContractVersion`;
- validar o relatório de cobertura;
- recusar payload legado ou raso no fluxo do Hermes;
- manter validação completamente local antes de acessar rede;
- publicar somente depois da validação estrita;
- preservar `referenceKey` em correções;
- confirmar o registro por leitura de retorno.

### FR-4: Template de payload

`reference-payload.json` deve deixar de ser um exemplo mínimo e tornar-se um
exemplo completo, com:

- todos os campos obrigatórios;
- quatro módulos de síntese;
- mapa com produto real;
- seções aprofundadas marcadas por dimensão;
- template operacional;
- molde completo;
- notas claras para ausência legítima de conteúdo.

### FR-5: Validador em camadas

O comando de validação deverá executar:

1. schema e tipos;
2. identidade e cardinalidade;
3. cobertura editorial;
4. integridade dos assets;
5. consistência entre stories, mapa, template e molde;
6. regras antiempobrecimento;
7. relatório final.

O relatório conterá:

- versão do contrato;
- erros bloqueantes;
- avisos;
- cobertura por story;
- cobertura da sequência;
- confirmação de que nenhuma chamada de rede ocorreu.

### FR-6: Regras antiempobrecimento

O validador deve rejeitar:

- ausência simultânea de `sourceExcerpt` e `noSourceTextReason`;
- seção aprofundada sem `covers`;
- dimensão obrigatória ausente;
- avaliação contextual ausente ou sem justificativa;
- três camadas integralmente duplicadas;
- síntese sem as quatro chaves canônicas;
- mapa sem entrada de produto real;
- template sem fórmula ou etapas operacionais;
- etapa sem função e resultado;
- movimento conceitual sem vínculo com uma tela do molde;
- representações legadas que contradigam os movimentos conceituais;
- molde sem placeholders funcionais;
- placeholders editoriais não preenchidos;
- títulos vazios ou o mesmo título copiado em `quick.title`, `visual.title` e
  `deep.title`;
- asset ausente ou sem correspondência com o item.

O validador pode avisar, sem bloquear automaticamente:

- densidade de texto excepcionalmente baixa ou alta;
- repetição lexical elevada;
- reaproveitamento exato de uma frase entre campos de camadas diferentes;
- seção muito longa;
- falta de marcadores visuais;
- discrepância entre quantidade de stories e etapas do molde.

Comprimento não será usado sozinho como prova de qualidade.

### FR-7: Compatibilidade

- Referências antigas continuam legíveis.
- O fluxo estrito é obrigatório para novas publicações pelo Hermes.
- A interface manual pode manter suporte legado.
- A ausência de `dossierContractVersion` em registros antigos não dispara
  migração automática.
- Uma correção cria nova revisão da mesma referência.

### FR-8: Renderização

Um dossiê canônico deve renderizar:

1. modo rápido;
2. sequência completa;
3. mapa com produto real;
4. raio-X visual;
5. gramática visual;
6. molde 9:16;
7. análise aprofundada em largura total abaixo da área compacta;
8. stories com imagem e texto alternados no desktop;
9. síntese transversal em grade 2 × 2 no desktop;
10. template registrado;
11. transferência para Bruno;
12. aplicações e aprendizados.

No mobile, o conteúdo será empilhado sem perda, sobreposição ou overflow
horizontal.

## 7. Testes e critérios de qualidade

### 7.1 Fixtures obrigatórias

#### Raul dourado

Representação completa do dossiê aprovado. Deve passar em todas as validações e
renderizar sem alteração visual relevante. A adequação ao contrato pode
adicionar versão, chaves e marcações de cobertura, mas não pode reescrever a
análise editorial aprovada.

#### Payload raso

Payload tecnicamente preenchido, mas com:

- uma seção genérica por tela;
- síntese de um único bloco;
- mapa sem produto real;
- template formado por rótulos;
- camadas integralmente duplicadas;
- dimensões centrais ausentes.

Deve falhar antes da rede.

#### Efeito Espelho atual

Snapshot obtido por leitura canônica, sem mutação, e normalizado apenas com a
versão e as chaves necessárias para exercer as regras editoriais. O texto atual
permanece inalterado. A fixture deve falhar por lacunas substantivas, não apenas
por ausência de `dossierContractVersion`.

#### Efeito Espelho corrigido

Só será criado após a implementação do contrato. Deve passar localmente antes
de qualquer pedido de publicação.

#### Variação de cardinalidade

Fixtures estruturais com uma, três e cinco telas devem comprovar que trilho,
raio-X, aprofundamento e molde não dependem de uma sequência de exatamente três
stories.

### 7.2 Testes automatizados

- schema aceita o Raul;
- cada regra antiempobrecimento possui ao menos um teste negativo;
- validador não chama rede em falha;
- versão, enums e regras do schema permanecem em paridade com o validador;
- hash da skill instalada corresponde ao artefato versionado;
- assets locais podem ser lidos durante análise, inspeção visual e validação de
  integridade, mas nenhum asset é enviado e nenhuma chamada remota ocorre antes
  da conclusão da validação estrutural e da revisão editorial;
- parser preserva `covers` e as chaves canônicas;
- referências legadas continuam renderizando;
- snapshots protegidos de Raul e
  `História → pequena entrega → CTA` permanecem inalterados;
- correção mantém `referenceKey` e incrementa revisão somente na persistência
  autorizada.

### 7.3 Testes visuais

Desktop:

- 1440 × 1000;
- 1920 × 1080.

Mobile:

- 390 × 844.

Verificar:

- primeiro viewport;
- legibilidade do modo rápido;
- prints sem crop destrutivo;
- raio-X em grade responsiva adequada à quantidade de stories;
- molde 9:16 estável;
- aprofundamento usando toda a largura editorial;
- alternância das telas sucessivas;
- síntese 2 × 2;
- ausência de grande faixa vazia causada pela estrutura;
- alcance do último conteúdo no mobile;
- zero overflow horizontal.

As asserções geométricas de desktop devem comprovar:

- as bordas esquerda e direita do aprofundamento coincidem, dentro de tolerância
  de 2 px, com a área editorial completa abaixo do modo rápido;
- em stories ímpares, o print precede a análise;
- em stories pares, a análise precede o print;
- os quatro módulos de síntese ocupam duas colunas e duas linhas;
- nenhum bloco de análise é limitado pela largura da antiga lista de templates.

### 7.4 Revisão humana

Validação determinística não substitui julgamento editorial. O agente deve
inspecionar os prints e confirmar que trechos, evidências, gestos, objetos e
inferências correspondem à fonte. O schema comprova estrutura; ele não comprova
que uma transcrição lida da imagem está correta.

O resultado da análise ou da validação apresentará:

- nome e fórmula do template;
- mapa da sequência;
- produto aparente e produto real;
- cobertura das dimensões;
- avisos do validador.

Isso não cria fila de rascunho nem segunda aprovação. Se o pedido original de
Bruno incluir explicitamente catalogar, colocar ou publicar na plataforma, a
operação segue após validação bem-sucedida. Se o pedido for somente analisar ou
pré-visualizar, o agente apresenta o resultado e não publica.

Migration, deploy, alteração de secrets e reparos de dados existentes continuam
exigindo autorizações específicas e separadas.

## 8. Fluxo operacional

```text
Bruno envia a sequência
  -> agente confirma que a sequência terminou
  -> skill analítica produz o contrato 1.0
  -> autoavaliação de cobertura
  -> skill de catalogação executa validação estrita local
  -> falha: nenhum acesso à rede
  -> sucesso: aguarda pedido explícito de catalogação/publicação
  -> prepara e envia assets
  -> persiste revisão atômica
  -> lê o registro de volta
  -> smoke do deep link
  -> informa referência, template, revisão e link
```

## 9. Escopo de implementação

### 9.1 Criar

- `hermes-skills/_shared/canonical-story-dossier-contract.md`;
- `hermes-skills/_shared/canonical-story-dossier.schema.json`;
- `hermes-skills/story-sequence-template-analysis/` como fonte versionada da
  skill hoje instalada apenas no WSL;
- `hermes-skills/catalog-story-reference/tests/fixtures/raul-golden.json`;
- `hermes-skills/catalog-story-reference/tests/fixtures/thin-dossier.json`;
- `hermes-skills/catalog-story-reference/tests/fixtures/effect-mirror-current.json`;
- relatório estruturado de validação emitido pelo publicador;
- testes de cobertura e regressão visual.

### 9.2 Modificar

- `story-sequence-template-analysis/SKILL.md`;
- `story-sequence-template-analysis/templates/analysis-output.md`;
- exemplo calibrado de Raul;
- `catalog-story-reference/SKILL.md`;
- `catalog-story-reference/references/payload-contract.md`;
- `catalog-story-reference/templates/reference-payload.json`;
- `catalog-story-reference/scripts/publish_story_reference.py`;
- testes do publicador;
- tipos e parsers compartilhados da plataforma, quando exigidos pelos novos
  campos;
- testes de apresentação do dossiê.

### 9.3 Fora desta implementação

- mutação da referência Efeito Espelho em produção;
- deploy da plataforma;
- migration remota;
- alteração de secrets;
- backfill de referências antigas;
- editor visual.

Essas operações exigirão autorização específica depois dos testes locais.

## 10. Dependências

| Dependência | Estado | Impacto |
| --- | --- | --- |
| Dossiê de Raul e evidências visuais | Disponível | Baseline da arquitetura |
| Skill analítica instalada no WSL | Disponível, mas fora da fonte versionada atual | Precisa ser incorporada ao repositório |
| Skill de catalogação versionada | Disponível | Principal ponto de integração |
| Publicador e testes Python | Disponíveis | Receberão validação estrita |
| Componentes do dossiê | Disponíveis | Precisam aceitar os campos normalizados |
| Referência Efeito Espelho | Disponível na plataforma | Usada apenas como fixture local até nova autorização |

## 11. Riscos e mitigação

| Risco | Impacto | Mitigação |
| --- | --- | --- |
| Validador premiar texto longo em vez de análise | Alto | Validar dimensões e consistência, não volume isolado |
| Contrato rígido impedir formatos legítimos | Alto | Fixar perguntas analíticas e permitir títulos/agrupamentos variáveis |
| Skills do repositório e WSL divergirem | Alto | Repositório como fonte canônica e instalação derivada |
| Alteração acidental do Raul | Alto | Fixture dourada e snapshot protegido |
| Regressão em templates antigos | Alto | Contrato estrito somente no publicador Hermes e testes legados |
| Validação semântica insuficiente | Médio | Relatório determinístico mais revisão humana |
| Correção remota prematura | Alto | Separar implementação, mutação e deploy por autorização |
| Duplicação da referência corrigida | Alto | Reutilizar `referenceKey` e testar revisão |

## 12. Fases e checkpoints

### Fase 0: Congelamento dos baselines

- extrair fixture dourada do Raul;
- capturar snapshot local do Efeito Espelho atual;
- proteger o template independente;
- não alterar dados remotos.

### Fase 1: Contrato e schema

- escrever o contrato compartilhado;
- criar schema;
- alinhar template de análise e payload;
- validar fixtures.

### Fase 2: Validador

- implementar cobertura e regras antiempobrecimento;
- gerar relatório;
- comprovar zero rede em falha.

### Fase 3: Skills

- versionar a skill analítica;
- atualizar as duas skills;
- instalar a versão testada no Hermes;
- realizar teste seco sem publicação.

### Fase 4: Plataforma e visual

- adicionar campos normalizados necessários;
- executar regressões;
- validar Raul, legado e Efeito local;
- produzir capturas desktop e mobile.

### Fase 5: Correção do Efeito Espelho

- iniciar somente a partir de um pedido explícito de correção;
- reconstruir o payload e apresentar preview e relatório como evidência;
- não criar uma segunda aprovação editorial quando o pedido inicial já incluir
  a correção;
- solicitar autorização para mutação remota apenas se ela não estiver incluída
  explicitamente no pedido inicial;
- publicar como nova revisão da mesma referência;
- ler de volta e validar.

## 13. Critérios de aceite

A implementação estará pronta quando:

- existe uma fonte canônica versionada para o padrão;
- as duas skills apontam explicitamente para ela;
- o template de saída representa todas as camadas;
- o Raul passa como fixture dourada;
- payloads rasos e o Efeito atual falham pelos motivos esperados;
- o validador fornece cobertura por story;
- nenhuma falha local acessa a rede;
- referências legadas continuam disponíveis;
- Raul e o template independente permanecem intactos;
- um dossiê corrigido renderiza rápido, raio-X, molde e aprofundamento na
  arquitetura aprovada;
- nenhuma mutação ou publicação ocorre sem autorização específica.

## 14. Decisões tomadas

- Opção escolhida: contrato, validador, testes e atualização das skills.
- O Raul é referência dourada de arquitetura.
- O contrato valida cobertura, não quantidade arbitrária de texto.
- A análise aprofundada é canônica.
- Novas publicações do Hermes usam validação estrita.
- Registros antigos permanecem compatíveis.
- O Efeito Espelho será corrigido somente depois do padrão passar nos testes.
- A correção reutilizará a identidade da referência.
- Implementação local não autoriza migration, deploy ou publicação.

## 15. Documentos relacionados

- `2026-07-24-raul-sena-dossier-fidelity-rebuild-design.md`
- `2026-07-24-hermes-story-reference-publisher-design.md`
- `catalog-story-reference/SKILL.md`
- `catalog-story-reference/references/payload-contract.md`
- `story-sequence-template-analysis/SKILL.md`
- `story-sequence-template-analysis/templates/analysis-output.md`
- `story-sequence-template-analysis/references/example-raul-sena-cena-lente-principio.md`

## 16. Histórico

| Versão | Data | Mudança |
| --- | --- | --- |
| 1.0 | 2026-07-25 | Primeira versão do contrato |
| 1.1 | 2026-07-25 | Revisão técnica: cobertura entre camadas, cardinalidade, fonte canônica, validação visual e fluxo sem segunda aprovação |
