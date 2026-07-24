# Design: campanhas agrupadas por vídeo com prévia expansível

Data: 2026-07-14

Status: desenho aprovado por Bruno; implementação ainda não autorizada

## Contexto

A tela de campanhas já agrupa os links pelo `video_id`, mas cada posição de CTA ainda recebe o peso visual de uma campanha independente. Status, título, métricas, metadados, link público, HotLink direto e ação de desativação são repetidos em três blocos grandes. O resultado técnico está correto, porém a hierarquia visual faz descrição, comentário fixado e resposta parecerem vídeos distintos.

O catálogo carregado pela interface já fornece `video_id`, `title`, `published_at`, `content_type` e `thumbnail_url`. Portanto, a melhoria não exige nova integração com o YouTube, alteração de banco, credenciais, webhook ou função de backend.

## Objetivo

Representar cada vídeo como uma unidade visual única e seus links como variações subordinadas. O usuário deve conseguir:

- reconhecer o vídeo pela miniatura e pelo título;
- entender imediatamente que os links `D`, `C` e `R` pertencem ao mesmo vídeo;
- copiar o link público de cada posição com uma ação direta;
- comparar cliques, vendas e receita por posição;
- abrir o vídeo no próprio card somente quando precisar;
- acessar informações operacionais sem poluir o fluxo principal.

## Fora do escopo

- alterar geração, resolução ou formato dos links públicos;
- modificar campanhas existentes ou seus slugs;
- alterar a landing page do MAPA-7P;
- alterar o portal de membros;
- alterar credenciais, secrets, webhook Hotmart ou configuração de produção;
- buscar metadados adicionais na API do YouTube;
- reproduzir vários vídeos automaticamente;
- redesenhar outras áreas da Inteligência Comercial.

## Abordagens consideradas

### Miniatura com player expansível — escolhida

A miniatura identifica o vídeo sem custo de um player carregado permanentemente. Após clique explícito, o card carrega um iframe do YouTube em modo de privacidade. É a melhor combinação entre reconhecimento, desempenho e limpeza visual.

### Miniatura estática com link externo

É a alternativa mais leve, mas obriga a saída da tela para confirmar o vídeo. Resolve a identificação, porém oferece menos utilidade operacional.

### Player sempre carregado

É imediato para um único vídeo, mas escala mal: cada grupo adiciona iframe, requisições externas, controles e ruído visual. Foi descartado.

## Arquitetura da interface

### `VideoCampaignBundle`

Cada `video_id` é renderizado como um único card. O componente recebe os metadados do vídeo, as campanhas associadas e as métricas de atribuição já carregadas pela tela.

Responsabilidades:

- apresentar a identidade do vídeo;
- calcular e exibir o resumo agregado do grupo;
- controlar localmente se a prévia está recolhida ou expandida;
- ordenar e renderizar as posições de CTA;
- abrigar os detalhes técnicos recolhidos.

Não realiza requisição ao backend e não altera campanha.

### `VideoPreview`

Estado inicial:

- exibe `thumbnail_url` em proporção 16:9;
- sobrepõe botão de play acessível;
- não cria iframe.

Após clique explícito:

- substitui a miniatura por um iframe responsivo;
- usa `https://www.youtube-nocookie.com/embed/<video_id>?autoplay=1`;
- informa o título do vídeo no atributo `title`;
- oferece controle para recolher a prévia;
- remove o iframe ao recolher, interrompendo a reprodução.

A tela não inicia reprodução sem clique do usuário. O estado permanece independente por card: mais de um vídeo só ficará carregado se o próprio usuário expandir mais de um grupo.

### `CampaignPositionRow`

Cada campanha ocupa uma linha compacta dentro do card, com esta ordem:

1. identificador visual `D`, `C` ou `R`;
2. rótulo por extenso: Descrição, Comentário fixado ou Resposta;
3. link público rastreável;
4. botão Copiar;
5. métricas da posição: cliques, vendas e líquido;
6. indicação discreta quando a campanha não estiver ativa.

O link público é o elemento operacional principal. HotLink direto, nome interno, tracking code, produto e ação de ativar ou desativar não são repetidos no fluxo principal.

### Detalhes técnicos

Um único controle `Detalhes técnicos` fica no rodapé do card. Ao expandir, apresenta uma subseção por posição contendo:

- status completo;
- nome da campanha;
- produto;
- tracking code;
- HotLink direto com ação de copiar;
- ação existente de ativar ou desativar campanha.

As ações preservam as mesmas permissões atuais. O redesenho apenas muda sua localização visual.

## Hierarquia visual

Estrutura conceitual:

```text
┌────────────────────────────────────────────────────────────────┐
│ [ MINIATURA 16:9 ▶ ]  Título do vídeo                          │
│                       ID · quantidade e estado dos links        │
│                       total de cliques · vendas · líquido       │
│                                                                │
│  D  Descrição          link público   [Copiar]   métricas       │
│  C  Comentário fixado  link público   [Copiar]   métricas       │
│  R  Resposta           link público   [Copiar]   métricas       │
│                                                                │
│  ▸ Detalhes técnicos                                          │
└────────────────────────────────────────────────────────────────┘
```

No cabeçalho, o estado do grupo é resumido como `3 links ativos`. Em estados mistos, a interface informa a composição, por exemplo `2 ativos · 1 inativo`, sem esconder a condição de nenhuma campanha.

As métricas do cabeçalho são a soma das posições pertencentes ao vídeo. As métricas de cada linha continuam disponíveis para comparação e atribuição. Nenhuma métrica é recalculada no backend.

## Responsividade

### Desktop

- miniatura à esquerda e identidade/resumo à direita;
- linhas de posição em grade, mantendo rótulo, link, ação e métricas alinhados;
- card delimita visualmente todo o conjunto.

### Mobile

- miniatura ocupa a largura do card;
- identidade e resumo aparecem abaixo;
- cada posição empilha rótulo, link e métricas sem rolagem horizontal;
- botão Copiar permanece próximo do link correspondente;
- detalhes técnicos usam a mesma largura do card.

## Fluxo de dados e estado

1. A tela carrega campanhas, catálogo e atribuição pelo fluxo existente.
2. As campanhas são agrupadas por `video_id` como ocorre atualmente.
3. Os metadados do catálogo são associados ao grupo pelo mesmo `video_id`.
4. O card soma as métricas das campanhas para formar o resumo do vídeo.
5. Cada linha recebe sua campanha e suas métricas individuais.
6. O estado expandido do player permanece local ao card e não é persistido.
7. Copiar, ativar ou desativar continua usando as operações existentes.

## Tratamento de erros

- metadados ausentes: usar o `video_id` como identificação principal;
- `thumbnail_url` ausente ou imagem com erro: mostrar fallback 16:9 com ícone de reprodução e texto `Prévia indisponível`;
- `video_id` fora do padrão seguro `[A-Za-z0-9_-]{11}`: não criar iframe nem link externo;
- iframe indisponível ou bloqueado: manter o card funcional; copiar links e consultar métricas não dependem do player;
- falha ao copiar: manter o link selecionável e exibir retorno de erro próximo à ação;
- falha ao alterar status: preservar o estado anterior e usar o tratamento de erro já existente na tela.

## Acessibilidade

- o botão da prévia usa nome acessível com o título do vídeo;
- o controle informa `aria-expanded`;
- o iframe recebe `title` descritivo;
- os identificadores `D`, `C` e `R` nunca substituem os rótulos por extenso;
- estado não depende exclusivamente de cor;
- todos os controles permanecem acessíveis por teclado e com foco visível.

## Estratégia de implementação

O componente atual de rastreamento já concentra formulário, agrupamento e listagem. Para evitar aumentar o acoplamento, a apresentação do grupo deve ser extraída para componentes focados, mantendo carregamento e mutações no componente pai.

Áreas previstas:

- `src/components/commercial-intelligence/CampaignTracking.tsx`: montagem dos grupos e integração com ações existentes;
- novo componente de apresentação do conjunto por vídeo;
- `ci-app/src/app.css`: estilos do card, prévia, linhas, detalhes e responsividade;
- funções puras de agrupamento e resumo cobertas pelo executor `node:test` já instalado;
- smoke visual existente, baseado em Playwright, ampliado para validar interação e responsividade.

Nenhuma alteração é prevista em migrations, Edge Functions ou serviços externos.

## Testes

### Automatizados com a infraestrutura existente

- três campanhas do mesmo `video_id` geram um único card;
- campanhas de vídeos diferentes geram cards distintos;
- título, miniatura e ID vêm do catálogo correto;
- resumo agregado soma as métricas das posições;
- cada linha preserva suas métricas individuais;
- ordem das posições é `D`, `C`, `R` quando existirem;
- estados ativos e mistos são descritos corretamente;

### Smoke visual com Playwright

- clique na miniatura cria o iframe correto em modo de privacidade;
- recolher a prévia remove o iframe;
- fallback aparece quando a miniatura não existe ou falha;
- copiar usa o link público da posição correta;
- detalhes técnicos começam recolhidos e preservam as ações existentes;
- layout não produz rolagem horizontal nos breakpoints suportados.

### Verificação visual e funcional

- conferir desktop e mobile com um grupo de três links;
- confirmar que o card é percebido como um vídeo com três posições;
- abrir e recolher o player;
- copiar os três links e comparar com os slugs publicados;
- confirmar métricas agregadas e individuais;
- confirmar que detalhes técnicos não dominam o fluxo principal;
- executar a suíte completa da Inteligência Comercial.

## Critérios de aceitação

- cada vídeo aparece como um único card visual;
- miniatura e título permitem reconhecer o vídeo sem ler o ID;
- o player só é carregado depois de interação explícita e pode ser recolhido;
- descrição, comentário fixado e resposta aparecem como variações subordinadas;
- os três links públicos permanecem visíveis e copiáveis;
- métricas totais e por posição permanecem disponíveis;
- informações técnicas começam recolhidas;
- ações e permissões existentes são preservadas;
- a tela funciona em desktop e mobile;
- nenhuma credencial, webhook, produção, landing page ou portal de membros é alterado.

## Rollback

Como a mudança é exclusivamente de apresentação, o rollback consiste em restaurar a renderização anterior do agrupamento e seus estilos. Campanhas, links, cliques, atribuições e integrações permanecem intactos.
