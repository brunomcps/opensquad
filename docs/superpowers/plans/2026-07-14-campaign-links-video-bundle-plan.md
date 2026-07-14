# Plano de implementação: campanhas agrupadas por vídeo

Referência: `docs/superpowers/specs/2026-07-14-campaign-links-video-bundle-design.md`

Status: pronto para execução local; implementação e publicação ainda dependem de autorização explícita

## Princípios

- Tratar cada vídeo como a unidade visual principal e cada posição de CTA como uma linha subordinada.
- Reutilizar `video_id`, `title` e `thumbnail_url` já entregues por `ci-campaigns`.
- Não alterar banco, Edge Functions, geração de links, credenciais, webhook, landing page ou portal de membros.
- Não adicionar biblioteca de interface ou testes.
- Preservar permissões e operações atuais de copiar, ativar e desativar.
- Validar localmente e registrar evidências antes de pedir autorização para publicação.

## Etapa 0 — baseline e proteção de escopo

1. Confirmar branch e worktree limpo.
2. Registrar o estado atual do agrupamento e as classes usadas em `CampaignTracking.tsx` e `app.css`.
3. Rodar a suíte existente antes da mudança:

```text
npm test
npm run typecheck
npm run ci:build:web
npm run ci:verify-bundle
```

4. Se houver falha preexistente, parar e registrar separadamente; não mascarar no diff do redesenho.
5. Confirmar que nenhum arquivo do portal de membros entrou no escopo.

## Etapa 1 — modelo puro dos conjuntos por vídeo

Arquivos:

- criar `src/components/commercial-intelligence/campaignBundleModel.ts`;
- criar `server/services/commercial-intelligence/campaignBundleModel.test.ts`;
- ajustar imports em `src/components/commercial-intelligence/CampaignTracking.tsx`.

Implementar funções puras para:

1. associar metadados do catálogo a cada `video_id`;
2. agrupar campanhas pelo vídeo;
3. ordenar posições como descrição, comentário fixado, resposta e depois posições genéricas;
4. mapear posições para identificador curto e rótulo completo;
5. somar cliques, vendas e líquido sem alterar métricas individuais;
6. resumir estados como `3 links ativos` ou `2 ativos · 1 inativo`;
7. validar IDs de embed com `[A-Za-z0-9_-]{11}`;
8. produzir fallback de título e miniatura quando o catálogo estiver incompleto.

Cobrir com `node:test`:

- três campanhas do mesmo vídeo geram um conjunto;
- vídeos diferentes continuam separados;
- a ordem `D`, `C`, `R` é estável;
- totais agregados correspondem à soma das posições;
- campanha sem atribuição contribui com zero;
- estados homogêneos e mistos são descritos corretamente;
- metadados ausentes usam fallback;
- IDs válidos e inválidos são distinguidos.

Gate: `npm test` deve passar antes da camada visual.

## Etapa 2 — componente do conjunto e prévia expansível

Arquivos:

- criar `src/components/commercial-intelligence/VideoCampaignBundle.tsx`;
- modificar `src/components/commercial-intelligence/CampaignTracking.tsx`.

Implementar em `VideoCampaignBundle.tsx`:

1. cabeçalho único com miniatura 16:9, título, ID, resumo de estados e métricas agregadas;
2. `VideoPreview` local com miniatura inicial e botão acessível;
3. criação tardia do iframe somente após clique;
4. URL `https://www.youtube-nocookie.com/embed/<video_id>?autoplay=1`;
5. remoção do iframe quando a prévia for recolhida;
6. fallback visual quando a miniatura estiver ausente ou falhar;
7. bloqueio do iframe quando o ID não cumprir o padrão seguro;
8. uma linha compacta por posição, com identificador, rótulo, link público, ação Copiar e métricas;
9. indicação textual discreta para campanha inativa ou em rascunho;
10. um único `<details>` técnico no rodapé, fechado inicialmente;
11. subseção técnica por posição com status, nome, produto, tracking code, HotLink direto e ação administrativa atual.

Modificar `CampaignTracking.tsx` para:

1. manter carregamento, filtros, formulário e mutações no componente pai;
2. substituir o markup repetido por `VideoCampaignBundle`;
3. passar callbacks existentes de cópia e mudança de status;
4. capturar falha do Clipboard API e mostrar erro próximo à ação correspondente;
5. preservar comportamento para usuários sem papel administrativo.

Gate: `npm run typecheck` deve passar antes dos estilos finais.

## Etapa 3 — hierarquia visual e responsividade

Arquivo:

- modificar `ci-app/src/app.css`.

Implementar:

1. card delimitando todo o conjunto do vídeo;
2. cabeçalho desktop com miniatura à esquerda e resumo à direita;
3. botão de play, foco visível e estados hover sem depender somente de cor;
4. grade consistente para as linhas `D`, `C` e `R`;
5. link público com truncamento visual, mas valor integral copiável e selecionável;
6. métricas por posição alinhadas e mais leves que o resumo do vídeo;
7. detalhes técnicos visualmente secundários;
8. estados de fallback e campanha não ativa;
9. adaptação no breakpoint existente de `640px` para miniatura e linhas empilhadas;
10. adaptação intermediária entre `641px` e `1100px` sem rolagem horizontal.

Remover ou reaproveitar apenas as regras antigas diretamente substituídas. Não fazer refatoração geral do CSS.

Gate: `npm run ci:build:web` e `npm run ci:verify-bundle` devem passar.

## Etapa 4 — smoke visual e interativo

Arquivo:

- modificar `server/scripts/commercial-intelligence/visual-decision-smoke.ts`.

Ajustar fixtures para conter:

- um vídeo com miniatura e as três posições `D`, `C` e `R`;
- métricas distintas por posição;
- pelo menos um estado misto;
- um segundo vídeo para confirmar separação entre conjuntos;
- fallback de miniatura ou metadado em pelo menos um caso.

Evitar dependência de rede externa:

1. usar miniatura controlada na fixture;
2. interceptar o endereço `youtube-nocookie.com/embed/*` e devolver HTML controlado;
3. conceder permissão de clipboard ao contexto quando suportado.

Validar no Playwright:

1. um único card contém as três posições do mesmo vídeo;
2. os links públicos correspondem às posições corretas;
3. detalhes técnicos começam fechados e abrem sob comando;
4. clicar na prévia cria iframe com o ID correto;
5. recolher a prévia remove o iframe;
6. fallback não quebra o card;
7. não existe overflow horizontal em 1366 × 768 e 390 × 844;
8. prévia, cópia do link público, detalhes técnicos e mudança administrativa de status continuam acessíveis por teclado;
9. o botão Copiar usa o link da posição correspondente;
10. ações administrativas permanecem restritas ao papel atual.

Capturar:

- desktop recolhido;
- desktop com player expandido;
- mobile recolhido;
- mobile com detalhes técnicos abertos.

## Etapa 5 — validação completa local

Executar no diretório `6-infra/content-hub`:

```text
npm test
npm run typecheck
npm run ci:build:web
npm run ci:verify-bundle
npm run ci:check:edge
```

Depois:

1. iniciar preview local da aplicação privada;
2. executar `npm run ci:smoke:decisions`;
3. conferir visualmente as quatro capturas;
4. confirmar que nenhum iframe existe antes da interação;
5. confirmar que links, campanhas e métricas das fixtures não foram alterados pelo redesenho.

Não executar smoke de produção nesta etapa.

## Etapa 6 — evidências e revisão do diff

Criar:

- `docs/commercial-intelligence/evidence/2026-07-14-video-campaign-bundle-local.md`.

Registrar:

- commit/base testada;
- arquivos alterados;
- comandos e resultados;
- quantidade de testes aprovados;
- capturas desktop e mobile;
- confirmação de ausência de alteração em banco, credenciais, webhook e portal de membros;
- limitações ou falhas encontradas;
- instrução de rollback.

Revisar o diff para impedir:

- alteração em `supabase/functions`, migrations ou configuração de secrets;
- mudança nos slugs ou destinos já publicados;
- arquivo do portal de membros;
- dependência nova no `package.json`;
- chamada ao YouTube antes de interação explícita, além da miniatura já fornecida pelo catálogo.

## Etapa 7 — gate de publicação

Após testes e evidências locais:

1. apresentar diff, resultados e capturas a Bruno;
2. pedir autorização específica para publicar somente o frontend da Inteligência Comercial;
3. se autorizado, publicar pelo fluxo existente do Cloudflare Pages;
4. executar smoke autenticado da tela publicada sem alterar campanha ou dados;
5. registrar evidência de produção e URL verificada;
6. se houver regressão, restaurar o deployment anterior do frontend.

Nenhuma mudança em credenciais, webhook ou produção está autorizada por este plano.

## Critério de conclusão

A implementação local termina quando:

- a hierarquia é um vídeo → várias posições;
- a prévia é reconhecível, tardia e recolhível;
- links e métricas totais e individuais permanecem corretos;
- detalhes técnicos não dominam a tela;
- desktop e mobile passam no smoke;
- a suíte completa passa;
- evidências ficam registradas;
- o diff permanece exclusivamente no frontend, testes e documentação de evidência.
