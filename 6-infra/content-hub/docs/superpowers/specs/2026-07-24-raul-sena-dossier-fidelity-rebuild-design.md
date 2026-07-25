# Reconstrução fiel do dossiê de stories do Raul Sena

## Objetivo

Reconstruir no aplicativo real de Inteligência Comercial a experiência editorial
acumulada nos protótipos do dossiê de Raul Sena.

A reconstrução deve recuperar a hierarquia, a navegação progressiva e a
composição visual projetadas. Não basta preservar o conteúdo dos protótipos
dentro do componente genérico atual.

O template independente `História → pequena entrega → CTA`, sua referência
`Stories para Enriquecer` e seus cinco itens permanecem fora desta reconstrução.

## Referência canônica

A experiência final combina:

1. modo rápido e raio-X visual de `08-visual-xray.png`
2. molde visual de `09-placeholder-template.png`
3. análise completa de `07-enriched-dossier.png`
4. estrutura acumulada de
   `C:\tmp\story-redesign-comparison\visual-template.html`

As quatro abas `Leitura`, `Arquitetura`, `Template` e `Aplicação`, presentes no
protótipo anterior `workbench.html`, não fazem parte da arquitetura final.

## Problema atual

O componente publicado mistura três camadas editoriais diferentes:

- leitura narrativa rápida
- inventário visual
- análise aprofundada

O mesmo `visual.title` acaba usado nas três camadas. Além disso, a tela genérica
de administração aparece antes do modo rápido e todas as seções são mostradas em
um fluxo longo, sem as ações que orientavam o aprofundamento.

## Arquitetura da experiência

### 1. Identidade da seção

A área passa a se apresentar como `Biblioteca de stories`.

O cabeçalho contém:

- título `Biblioteca de stories`
- descrição editorial curta
- ações globais já existentes, sem duplicação

O card genérico `Templates de stories` não aparece acima da biblioteca.

### 2. Biblioteca lateral

A coluna lateral contém:

- busca
- grupo `Templates vivos`
- templates disponíveis
- atalhos `Favoritos` e `Ainda não testados`

O template de Raul usa:

- nome editorial: `Cena comum → lente do especialista → valor pessoal`
- resumo: `Raul Sena · 3 telas · dossiê completo`

O nome persistido pode continuar sendo a identidade técnica atual. O nome
editorial é uma camada de apresentação do dossiê.

### 3. Modo rápido

O modo rápido é o primeiro conteúdo do template, sem um cabeçalho administrativo
intermediário.

Ele contém:

- nome editorial do template
- assunto aparente
- produto real
- navegador dos três stories
- ação `Sequência completa`
- story selecionado em composição dividida

Cada item do navegador usa um rótulo editorial:

- Story 1: `Cena e gancho`
- Story 2: `Virada pro nicho`
- Story 3: `Status e valores`

O story selecionado apresenta:

- print 9:16 anotado
- legenda dos marcadores
- papel narrativo
- título narrativo
- trecho original
- evidência concreta
- efeito no público
- subtexto
- função no funil
- regra extraída

O rodapé contém:

- `Ver raio-X visual`
- `Abrir análise completa`

### 4. Sequência completa

A ação `Sequência completa` substitui o foco individual por:

- leitura geral curta
- três prints lado a lado
- papel de cada story

Ela não abre outra página nem remove o navegador.

### 5. Mapa da sequência

Uma faixa abaixo do modo rápido apresenta:

- gancho: identificação e curiosidade
- recompensa: humor e autoridade
- fechamento: prova social e confiança
- produto real: persona financeiramente racional

### 6. Raio-X visual

O raio-X é uma seção endereçável por âncora.

Cada um dos três cards apresenta:

- print
- papel visual
- título visual
- cena e pessoa
- texto e tipografia
- distribuição
- elemento gráfico, quando existir
- paleta dominante
- sensação transmitida

Após os cards, a seção apresenta a gramática visual da sequência.

### 7. Molde visual

O molde é uma faixa verde independente, com:

- título e descrição
- ação `Usar este molde`
- três celulares 9:16
- placeholders posicionados dentro dos celulares
- função fixa de cada etapa
- regras `Preservar`, `Adaptar` e `Evitar`

As etapas são:

1. Cena e gancho
2. Lente do especialista
3. Resposta e princípio

### 8. Análise completa

A análise completa é uma seção endereçável por âncora e contém:

1. cabeçalho com `Voltar ao modo rápido`
2. card escuro `Leitura geral`
3. estrutura resumida da sequência
4. análise profunda dos três stories
5. leitura transversal
6. verdadeiro produto da sequência
7. template registrado
8. regras de transferência para Bruno
9. nota da referência fundadora

Cada story profundo possui:

- número
- título analítico
- papel narrativo
- trecho original
- texto de abertura
- seções de análise
- regra extraída

Os três stories alternam a posição de imagem e texto no desktop. No mobile,
imagem e texto são empilhados na mesma ordem.

### 9. Aplicação e aprendizados

`Publicações vinculadas` e `Aprendizados` ficam no final do dossiê, depois da
análise completa.

A ação `Usar este molde` inicia a criação de uma publicação já vinculada ao
template de Raul. Enquanto a criação integrada não estiver disponível, a ação
deve levar ao formulário existente com o template pré-selecionado. Ela não pode
ser um botão sem efeito.

## Modelo de dados

Cada story separa explicitamente as três camadas:

```text
metadata
├── quick
│   ├── roleLabel
│   ├── title
│   ├── summary
│   ├── evidence
│   ├── audienceEffect
│   ├── subtext
│   ├── funnelFunction
│   └── extractedRule
├── visual
│   ├── roleLabel
│   ├── title
│   ├── scene
│   ├── typography
│   ├── composition
│   ├── graphic
│   ├── palette
│   ├── impression
│   └── markers
└── deep
    ├── roleLabel
    ├── title
    ├── lead
    ├── sections
    └── extractedRule
```

A referência também preserva:

```text
analysis
├── summary
├── overview
├── sequenceMap
├── visualGrammar
├── synthesis
├── productRevealed
├── registeredTemplate
└── transferRules
```

Campos novos são opcionais no contrato geral e obrigatórios apenas para ativar
o dossiê visual completo do Raul.

## Componentes

O componente monolítico é dividido em:

- `StoryLibrarySidebar`
- `VisualDossierQuickMode`
- `VisualDossierStoryRail`
- `VisualDossierFocusedStory`
- `VisualDossierSequenceOverview`
- `VisualDossierSequenceMap`
- `VisualDossierXray`
- `VisualDossierMold`
- `VisualDossierDeepAnalysis`
- `VisualDossierApplication`

`TemplatesSection` continua responsável por carregar dados e selecionar o
template. A apresentação específica do Raul fica isolada em
`VisualReferenceDossier`.

## Comportamento

- trocar o story altera somente o foco do modo rápido
- `Sequência completa` troca o foco por uma visão dos três stories
- `Ver raio-X visual` rola até o raio-X
- `Abrir análise completa` rola até a análise
- `Voltar ao modo rápido` retorna ao topo do dossiê
- `Usar este molde` abre a criação com o template pré-selecionado
- o estado selecionado possui indicação visual e acessível
- a navegação por âncora respeita foco e movimento reduzido

## Regras visuais

- conteúdo editorial limitado a aproximadamente 1050–1180 px
- biblioteca lateral estável no desktop
- foco rápido dividido entre imagem e análise
- prints sempre preservam 9:16
- raio-X usa três colunas no desktop
- molde usa três celulares estáveis no desktop
- análise profunda alterna imagem e texto
- cards não são aninhados em cards decorativos
- não existe cabeçalho administrativo duplicado
- mobile não possui overflow horizontal

## Proteção do template independente

A migração e a interface visual específica selecionam somente:

- template técnico `Cena → lente → princípio`
- referência `https://www.instagram.com/_raulsena/`

O teste de migração registra um snapshot completo de:

- `História → pequena entrega → CTA`
- `Stories para Enriquecer`
- seus vínculos
- seus cinco itens

O snapshot deve permanecer idêntico antes e depois da migração.

## Verificação

### Contrato

- validação dos blocos `quick`, `visual` e `deep`
- rejeição de HTML, paletas inválidas e estruturas excessivas
- compatibilidade com templates sem dossiê visual

### Interface

- seleção dos três stories
- visão de sequência completa
- ações de navegação por âncora
- ação `Usar este molde`
- ausência das quatro abas antigas
- presença de todos os blocos da análise completa

### Visual

Capturas de referência:

- desktop 1440 × 1000
- desktop largo 1920 × 1080
- mobile 390 × 844

Critérios:

- primeiro viewport começa na biblioteca e no modo rápido
- composição do modo rápido corresponde ao protótipo
- três cards do raio-X aparecem alinhados
- três celulares do molde mantêm 9:16
- análise profunda alterna corretamente
- nenhum texto, imagem ou ação se sobrepõe

### Produção

- suíte completa
- typecheck
- build
- smoke visual com os dois templates
- validação autenticada no domínio público
- confirmação pós-migração dos dois vínculos independentes

## Implantação

1. aplicar a migração aditiva do dossiê
2. publicar o contrato `ci-content`
3. publicar preview do frontend
4. comparar preview com as referências
5. validar o template independente
6. promover para produção
7. repetir o smoke autenticado

## Fora de escopo

- recuperar as quatro abas do protótipo `workbench`
- alterar o conteúdo de `História → pequena entrega → CTA`
- redesenhar outras áreas da Inteligência Comercial
- substituir o fluxo editorial de publicações

## Autorrevisão

- não há campos, telas ou decisões pendentes
- a referência canônica está explícita
- os três significados de título não compartilham o mesmo campo
- as ações possuem destino definido
- a reconstrução está isolada do template independente
- os critérios de aceite cobrem estrutura, interação, visual e produção
