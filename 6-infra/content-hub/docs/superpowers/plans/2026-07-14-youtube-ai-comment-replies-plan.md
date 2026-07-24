# Plano de implementação: copiloto de respostas a comentários do YouTube

Referência: `docs/superpowers/specs/2026-07-14-youtube-ai-comment-replies-design.md`

Status: plano pronto para revisão; implementação ainda não autorizada

Branch de referência: `codex/commercial-intelligence-f0-f1`

Commit da especificação: `1cb981b5`

## Resultado esperado

Adicionar à aplicação privada de Inteligência Comercial uma área `Respostas` que:

- sincronize comentários novos e lotes históricos de vídeos longos;
- gere rascunhos pelo Codex autenticado com a conta ChatGPT de Bruno;
- aplique voz, fatos do MAPA-7P, segurança e link `-r` do vídeo;
- permita editar, regenerar, pular e publicar individualmente;
- confirme a resposta real no YouTube;
- não use Gemini, OpenAI Platform API ou fallback pago;
- não altere o portal de membros;
- não publique nem mude OAuth, credenciais ou produção sem gate explícito.

## Caminho crítico

O primeiro risco é o runtime Codex no Windows. O executável empacotado no aplicativo retornou `Acesso negado` quando invocado pelo PowerShell. Nenhuma camada de banco, frontend ou OAuth deve ser desenvolvida antes de um spike provar uma destas rotas oficiais:

1. `@openai/codex-sdk` usando seu runtime distribuído;
2. CLI oficial independente, autenticada pelo ChatGPT, controlada por um adaptador local.

Se ambas falharem, a implementação para no spike. Não haverá troca silenciosa por API paga.

## Gates obrigatórios

| Gate | Autoriza | Não autoriza |
| --- | --- | --- |
| G0 — iniciar implementação local | worktree, código, dependências e testes locais | login externo, chamadas Codex reais, Supabase hospedado ou YouTube |
| G1 — autenticação e três chamadas do spike | login ChatGPT local e três comentários históricos informados previamente | OpenAI Platform API ou publicação |
| G2 — modo sombra | migration/functions hospedadas e até quarenta chamadas Codex para vinte comentários, considerando uma regeneração por item | OAuth de escrita ou resposta no YouTube |
| G3 — OAuth e piloto | novo token local com escopo de resposta e cinco publicações individuais | lote de publicação ou automação |
| G4 — operação | novos comentários e histórico em lotes de cinquenta | publicação automática |

Cada gate exige apresentação do diff, dos testes, dos dados enviados, do número máximo de chamadas e do rollback aplicável.

## Tarefa 0 — isolar a implementação e registrar o baseline

### Por que vem primeiro

O worktree atual contém alterações não relacionadas:

- `package.json` modificado;
- `apply-youtube-mapa7p-links.ts` não rastreado;
- `audit-youtube-mapa7p-links.ts` não rastreado.

Elas pertencem a outro fluxo e não devem ser carregadas, escondidas ou sobrescritas.

### Ações

1. Depois de G0, criar um worktree limpo a partir de `1cb981b5`:

```text
git worktree add -b codex/youtube-ai-comment-replies C:\tmp\os-ci-youtube-replies 1cb981b5
```

2. Confirmar que o novo worktree começa limpo:

```text
git status --short
git branch --show-current
git log -1 --oneline
```

3. Executar baseline no diretório `6-infra/content-hub`:

```text
npm test
npm run typecheck
npm run ci:build:web
npm run ci:verify-bundle
npm run ci:check:edge
```

4. Registrar resultados, duração e falhas preexistentes em:

```text
docs/commercial-intelligence/evidence/youtube-comment-replies/00-baseline.md
```

5. Confirmar por busca que nenhum caminho do portal de membros aparece no diff.

### Gate de conclusão

- worktree limpo e isolado;
- baseline registrado;
- nenhuma alteração do worktree anterior copiada;
- nenhuma credencial lida ou modificada.

### Commit sugerido

Nenhum commit se o baseline não criar artefato autorizado. O arquivo de evidência entra junto da primeira entrega local.

## Tarefa 1 — provar Codex via ChatGPT no Windows

### Arquivos

- criar `server/services/commercial-intelligence/codexRuntime.ts`;
- criar `server/services/commercial-intelligence/codexRuntime.test.ts`;
- criar `server/scripts/commercial-intelligence/spike-codex-youtube-replies.ts`;
- criar `server/fixtures/commercial-intelligence/youtube-reply-spike.json` com dados sanitizados;
- modificar `package.json` somente no worktree novo;
- modificar lockfile apenas se o gerenciador gerar um.

### Primeiro os testes

Cobrir com `node:test`:

1. `OPENAI_API_KEY` e `CODEX_API_KEY` são removidas do ambiente filho;
2. `CODEX_HOME` aponta para diretório dedicado fora do repositório;
3. configuração exige `forced_login_method = "chatgpt"`;
4. diretório de execução não contém `.env`, código ou corpus completo;
5. prompt entra por API do SDK ou `stdin`, nunca como comando montado;
6. resposta fora do schema falha de forma fechada;
7. adaptador não possui caminho de fallback para API key;
8. log sanitizado não contém token nem comentário integral.

Executar o teste vermelho antes da implementação:

```text
node --import tsx --test server/services/commercial-intelligence/codexRuntime.test.ts
```

### Implementação

1. Adicionar o SDK oficial somente após G0.
2. Criar adaptador com interface pequena:

```text
generateStructuredReply(input) -> { authMode, modelObserved, output, usageObserved }
```

3. Usar sandbox somente leitura, diretório vazio, sem MCP e sem plugins.
4. Criar schema mínimo do spike: elegibilidade, modo, rascunho, link usado e warnings.
5. Implementar comando de preflight que verifica autenticação sem imprimir credenciais.
6. Não executar login ou geração ainda.

### Gate G1

Antes do login e das chamadas, apresentar a Bruno:

- serviço: Codex sob a assinatura ChatGPT;
- modelo observado ou seleção proposta;
- três chamadas esperadas;
- comentários históricos escolhidos, sem nome ou identificador do autor;
- título e contexto do vídeo enviados;
- regras de voz e fatos do MAPA enviados;
- impacto: consumo da franquia Codex, sem cobrança de OpenAI Platform API.

Depois de autorizado:

1. completar o login ChatGPT no navegador;
2. confirmar `chatgpt` como método ativo;
3. executar três comentários históricos, sem publicação;
4. validar JSON, isolamento e logs;
5. registrar evidência sanitizada em `01-codex-spike.md`.

### Gate de conclusão

- runtime funciona no Windows;
- método verificado é ChatGPT;
- nenhuma API key é usada;
- três saídas estruturadas válidas;
- nenhum segredo ou PII desnecessária aparece em evidência.

### Commit sugerido

```text
feat(ci): prove ChatGPT-authenticated Codex runtime
```

## Tarefa 2 — contratos, estados, elegibilidade e linter

### Arquivos

- criar `supabase/functions/_shared/youtubeReplies.ts`;
- criar `server/services/commercial-intelligence/youtubeReplyEligibility.ts`;
- criar `server/services/commercial-intelligence/youtubeReplyEligibility.test.ts`;
- criar `server/services/commercial-intelligence/youtubeReplyLinter.ts`;
- criar `server/services/commercial-intelligence/youtubeReplyLinter.test.ts`;
- criar `server/services/commercial-intelligence/youtubeReplySimilarity.ts`;
- criar `server/services/commercial-intelligence/youtubeReplySimilarity.test.ts`;
- criar fixtures em `server/fixtures/commercial-intelligence/youtube-replies/`.

### Testes de contrato e estado

1. definir enums de comentário, job, bloqueio e modo do MAPA;
2. provar todas as transições válidas;
3. rejeitar transições que pulam aprovação individual;
4. impedir segundo job ativo de geração;
5. impedir retorno de `published` para um texto com hash diferente;
6. limitar geração a duas tentativas.

### Testes de elegibilidade

Fixtures devem cobrir:

- dúvida, identificação, relato, agradecimento e testemunho elegíveis;
- suicídio ou automutilação;
- emergência;
- dose, troca ou interrupção de medicamento;
- menor de idade explícito;
- suporte, reembolso ou reclamação de comprador;
- spam, golpe, abuso e conteúdo sem sinal;
- comentário do canal;
- resposta anterior do canal;
- MAPA já oferecido no thread;
- caso ambíguo enviado para revisão manual.

### Testes do linter

- máximo de 180 palavras;
- sem bullets, `cê`, travessão ou abertura `Oi`;
- dois-pontos somente conforme a regra de link;
- emoji opcional somente no fechamento;
- exatamente um link;
- igualdade exata com o link `-r` esperado;
- ausência de link antigo, HotLink ou domínio inesperado;
- fatos canônicos do MAPA;
- ausência de diagnóstico, prescrição, dosagem, promessa e alegação não aprovada;
- resposta ao comentário antes da oferta;
- explicação do que é o MAPA;
- similaridade por trigramas abaixo de 50%.

### Comandos

```text
node --import tsx --test server/services/commercial-intelligence/youtubeReplyEligibility.test.ts
node --import tsx --test server/services/commercial-intelligence/youtubeReplyLinter.test.ts
node --import tsx --test server/services/commercial-intelligence/youtubeReplySimilarity.test.ts
npm test
```

### Gate de conclusão

Toda regra aprovada no spec possui pelo menos um teste positivo e um negativo. Nenhuma chamada externa ocorre.

### Commit sugerido

```text
feat(ci): define YouTube reply policy and validators
```

## Tarefa 3 — migration, leases e repositório

### Arquivos

- criar `supabase/migrations/20260714233000_ci_youtube_reply_copilot.sql`;
- criar `server/scripts/commercial-intelligence/youtube-reply-migration.test.ts`;
- criar `supabase/functions/_shared/youtubeReplyRepository.ts`;
- criar `server/services/commercial-intelligence/youtubeReplyRepository.test.ts`;
- ajustar tipos compartilhados sem alterar contratos Hotmart ou Analytics.

### Migration

Criar:

- `ci_youtube_comments`;
- `ci_youtube_reply_jobs`;
- `ci_youtube_reply_events`;
- `ci_youtube_reply_examples`;
- `ci_reply_worker_heartbeats`;
- índices de inbox, status, vídeo, data e lease;
- restrição de publicação única por comentário;
- RPC atômica de claim de job;
- RPC de heartbeat/renovação do lease;
- rotina de expiração ou limpeza de dados de origem.

Regras obrigatórias:

- RLS em todas as tabelas;
- acesso direto revogado de `anon` e `authenticated`;
- `service_role` restrito ao backend;
- nenhum token ou secret em tabela;
- nenhuma operação destrutiva;
- nenhuma referência ao portal de membros;
- texto bruto separado dos eventos de auditoria.

### Testes

1. começar com migration test vermelho;
2. verificar tabelas, checks, índices, RLS, grants e RPCs;
3. provar que SQL não contém `drop table`, `drop schema` ou PII não prevista;
4. testar o repositório com client fake;
5. simular dois workers disputando o mesmo job;
6. provar expiração e retomada de lease;
7. provar idempotência de comentário e publicação.

### Comandos

```text
node --import tsx --test server/scripts/commercial-intelligence/youtube-reply-migration.test.ts
node --import tsx --test server/services/commercial-intelligence/youtubeReplyRepository.test.ts
npm test
```

Não executar `npm run ci:migrate` nesta tarefa.

### Commit sugerido

```text
feat(ci): add durable YouTube reply queue schema
```

## Tarefa 4 — Edge Function autenticada

### Arquivos

- criar `supabase/functions/ci-youtube-replies/index.ts`;
- criar `supabase/functions/_shared/youtubeReplyHttp.ts`;
- criar `server/services/commercial-intelligence/youtubeReplyEdge.test.ts`;
- modificar `ci-app/src/api.ts` com tipos e funções;
- modificar `package.json` para incluir a função em `ci:check:edge`.

### Fluxos da interface

- listar inbox com cursor e filtros;
- solicitar sincronização;
- solicitar lote de geração;
- regenerar um item;
- salvar edição com versão esperada;
- pular;
- solicitar publicação com `final_text_hash`;
- excluir exemplo do corpus.

### Fluxos do worker

- heartbeat;
- claim de job;
- completar sincronização;
- completar geração;
- completar publicação;
- falhar job com erro sanitizado.

### Testes

- `401` sem sessão;
- `403` para `viewer` em leitura e mutação da aba privada;
- `admin` autorizado;
- cursor e filtros limitados;
- payload e texto com limites de tamanho;
- transição inválida retorna `409`;
- resposta não expõe `author_channel_id`, lease owner, tokens ou dados internos;
- worker não recebe `service_role`;
- erro interno é sanitizado;
- preflight e CORS preservam a allowlist atual.

### Comandos

```text
node --import tsx --test server/services/commercial-intelligence/youtubeReplyEdge.test.ts
npm run ci:check:edge
npm test
```

Não fazer deploy nesta tarefa.

### Commit sugerido

```text
feat(ci): expose authenticated YouTube reply queue API
```

## Tarefa 5 — sessão segura do worker e cliente da fila

### Arquivos

- criar `server/services/commercial-intelligence/workerSessionStore.ts`;
- criar `server/services/commercial-intelligence/workerSessionStore.test.ts`;
- criar `server/services/commercial-intelligence/youtubeReplyQueueClient.ts`;
- criar `server/services/commercial-intelligence/youtubeReplyQueueClient.test.ts`;
- criar `server/scripts/commercial-intelligence/login-youtube-reply-worker.ts`;
- modificar `package.json` com script de login local.

### Cofre local

Usar uma abstração de keyring. A candidata atual é `cross-keychain`, que declara suporte ao Windows Credential Manager por binding nativo. A implementação deve:

1. exigir backend nativo do Windows;
2. executar um probe de escrita, leitura e remoção com segredo sintético;
3. abortar se a biblioteca escolher PowerShell, arquivo ou backend nulo;
4. nunca passar segredo por argumento de processo;
5. guardar somente refresh token Supabase e identificador da conta;
6. nunca guardar senha;
7. permitir logout e revogação local.

Referência técnica a rever no momento da implementação: https://www.npmjs.com/package/cross-keychain

Se o backend nativo não funcionar, o fallback aceitável da V1 é login a cada inicialização. Texto puro e fallback por shell são proibidos.

### Cliente da fila

- renovar sessão Supabase;
- enviar heartbeat;
- reivindicar um job por vez;
- completar ou falhar com versão esperada;
- usar timeout e backoff limitado;
- nunca registrar bearer token;
- parar depois de repetidas falhas de autenticação.

### Testes

- session store fake nos testes comuns;
- probe nativo separado e manual;
- senha nunca chega ao storage;
- token nunca aparece em log;
- refresh bem-sucedido;
- `401` persistente pausa o worker;
- dois claims concorrentes não duplicam job;
- heartbeat offline fica visível depois do TTL.

### Commit sugerido

```text
feat(ci): add secure local worker session
```

## Tarefa 6 — cliente de comentários e publicação do YouTube

### Arquivos

- criar `server/services/commercial-intelligence/youtubeReplyClient.ts`;
- criar `server/services/commercial-intelligence/youtubeReplyClient.test.ts`;
- criar fixtures `youtube-comment-thread.json` e `youtube-comment-replies.json`;
- criar `server/scripts/commercial-intelligence/login-youtube-reply-oauth.ts` somente como código não executado;
- reutilizar `googleapis` já instalado.

### Métodos

```text
listRecentThreads(watermark)
listHistoricalThreads(videoId, cursor)
listAllReplies(parentId)
insertReply(parentId, textOriginal)
findEquivalentOwnerReply(parentId, normalizedHash)
```

### Regras

- usar token dedicado de respostas;
- não ler nem sobrescrever o token atual de Analytics;
- ignorar Shorts pelo catálogo `ci_youtube_videos`;
- importar somente comentários principais como alvos;
- detectar comentário próprio e resposta anterior do canal;
- buscar respostas completas quando `commentThread.replies` for parcial;
- sanitizar `textDisplay` e preservar `textOriginal` como texto;
- limitar tamanho antes de enviar ao modelo;
- nenhum retry automático de `comments.insert` após resultado incerto.

### Testes com fakes

- paginação de novos e históricos;
- parada no watermark;
- exclusão de Shorts e comentários próprios;
- detecção de resposta anterior;
- thread com replies parciais;
- comentário removido entre geração e publicação;
- retorno de `comments.insert`;
- falha depois do envio vira `publish_unknown`;
- busca por resposta equivalente evita duplicação;
- nenhum teste real usa OAuth ou quota.

### Commit sugerido

```text
feat(ci): add idempotent YouTube comment client
```

## Tarefa 7 — corpus de voz, recuperação e prompt

### Arquivos

- criar `server/services/commercial-intelligence/youtubeReplyVoice.ts`;
- criar `server/services/commercial-intelligence/youtubeReplyVoice.test.ts`;
- criar `server/services/commercial-intelligence/youtubeReplyPrompt.ts`;
- criar `server/services/commercial-intelligence/youtubeReplyPrompt.test.ts`;
- criar `server/scripts/commercial-intelligence/build-youtube-reply-gold-set.ts`;
- criar `server/services/commercial-intelligence/codexYoutubeReply.ts`;
- criar `server/services/commercial-intelligence/codexYoutubeReply.test.ts`;
- armazenar corpus runtime fora do repositório, em `%LOCALAPPDATA%\OpenSquad\content-hub\youtube-replies`.

### Corpus inicial

1. ler o CSV histórico sem alterá-lo;
2. selecionar candidatos variados por abertura, tamanho e modo;
3. remover autor, IDs, links e detalhes clínicos desnecessários;
4. excluir duplicatas e respostas com conflito de regras;
5. produzir entre 30 e 50 exemplos para revisão;
6. salvar apenas o corpus desidentificado após aprovação.

### Recuperação sem embeddings

- tokenização local em português;
- pesos por categoria, modo e termos;
- BM25 ou pontuação lexical equivalente implementada localmente;
- três a cinco exemplos por comentário;
- nenhum serviço vetorial ou API de embeddings.

### Prompt versionado

Construir hierarquia literal:

1. segurança e autoridade final;
2. fatos canônicos do MAPA;
3. regras específicas de comentários;
4. voz geral;
5. exemplos recuperados;
6. comentário delimitado como dado não confiável.

O schema de saída deve coincidir com o contrato da Tarefa 2. O adaptador usa uma sessão efêmera por comentário e concorrência um.

### Testes

- `cê` nunca entra pelo arquivo geral de voz;
- duração antiga não substitui aproximadamente 25 minutos;
- link antigo não entra no prompt;
- regra de bloco Markdown é removida do texto público;
- exemplos não contêm autor, ID ou URL original;
- recuperação escolhe exemplos relevantes e variados;
- comentário com `ignore as instruções` permanece apenas dado;
- prompt não contém segredo ou caminho sensível;
- resposta do Codex passa pelo linter antes de persistir;
- segunda falha vira revisão manual.

### Commit sugerido

```text
feat(ci): generate MAPA replies in Bruno voice
```

## Tarefa 8 — orquestrador do worker

### Arquivos

- criar `server/workers/youtubeReplyWorker.ts`;
- criar `server/workers/youtubeReplyWorker.test.ts`;
- criar `server/scripts/commercial-intelligence/run-youtube-reply-worker.ts`;
- modificar `package.json` com `ci:worker:youtube-replies`.

### Handlers

#### `sync`

- carregar catálogo de vídeos longos;
- sincronizar novos ou o cursor histórico solicitado;
- gravar comentários e contexto;
- atualizar watermark e contagens.

#### `generate`

- reler thread;
- resolver link `comment_reply` ativo e único;
- aplicar elegibilidade;
- montar contexto mínimo;
- gerar uma vez;
- validar;
- regenerar no máximo uma vez;
- persistir rascunho ou revisão manual.

#### `publish`

- confirmar texto e hash aprovados;
- reler comentário e respostas;
- executar linter novamente;
- chamar YouTube uma vez;
- readback e reply ID;
- usar `publish_unknown` diante de ambiguidade.

### Testes

- worker desligado não perde job;
- concorrência um;
- lease renovado;
- crash em geração permite retomada;
- crash após publicação não repete resposta;
- limite do Codex pausa fila;
- login expirado pausa fila;
- campanha ausente bloqueia geração;
- comentário já respondido bloqueia publicação;
- logs não contêm tokens ou comentário integral.

### Commit sugerido

```text
feat(ci): orchestrate YouTube reply jobs locally
```

## Tarefa 9 — API do frontend e aba Respostas

### Arquivos

- modificar `ci-app/src/api.ts`;
- modificar `ci-app/src/StandaloneCommercialIntelligenceView.tsx`;
- criar `src/components/commercial-intelligence/YouTubeReplyInbox.tsx`;
- criar `src/components/commercial-intelligence/YouTubeReplyCard.tsx`;
- criar `src/components/commercial-intelligence/ReplyWorkerStatus.tsx`;
- extrair ou reutilizar preview do vídeo sem duplicar lógica;
- criar `src/components/commercial-intelligence/youtubeReplyViewModel.ts`;
- criar `server/services/commercial-intelligence/youtubeReplyViewModel.test.ts`;
- modificar `ci-app/src/app.css`.

### Interface

1. mostrar a aba somente para `admin`;
2. exibir worker, heartbeat e filas;
3. oferecer `Sincronizar comentários`;
4. gerar lote de vinte no piloto e cinquenta depois do gate;
5. filtrar novos, históricos, vídeo, período e estado;
6. mostrar vídeo, comentário e thread;
7. editar rascunho sem perder alteração;
8. mostrar modo, link e warnings;
9. oferecer `Regenerar`, `Pular` e `Publicar no YouTube`;
10. desabilitar publicação em estado inseguro;
11. nunca oferecer seleção múltipla de publicação.

### Testes puros

- agrupamento e ordenação;
- contagens do cabeçalho;
- permissões por papel;
- estado do botão de publicação;
- mensagem de worker offline;
- preservação da edição;
- paginação e filtros;
- link do vídeo correto.

### Comandos

```text
npm test
npm run typecheck
npm run ci:build:web
npm run ci:verify-bundle
```

### Commit sugerido

```text
feat(ci): add YouTube reply review inbox
```

## Tarefa 10 — smoke visual e funcional controlado

### Arquivos

- criar `server/scripts/commercial-intelligence/visual-replies-smoke.ts`;
- adicionar `ci:smoke:replies` ao `package.json`;
- criar fixtures locais sem PII.

### Cenários

- worker online, offline e autenticação necessária;
- vinte itens históricos paginados;
- elegível com rascunho;
- bloqueado por segurança;
- campanha `-r` ausente;
- rascunho editado;
- falha de geração;
- falha e sucesso de publicação simulados;
- desktop 1366 × 768;
- mobile 390 × 844;
- navegação por teclado;
- nenhum overflow horizontal.

O Playwright intercepta todas as Edge Functions e qualquer embed do YouTube. Smoke local não acessa Codex, Supabase hospedado ou YouTube real.

### Evidências visuais

- inbox desktop;
- card expandido com thread e vídeo;
- revisão manual;
- mobile;
- confirmação simulada de publicação.

### Commit sugerido

```text
test(ci): cover YouTube reply review flow
```

## Tarefa 11 — validação local completa e revisão de segurança

### Comandos

```text
npm test
npm run typecheck
npm run ci:build:web
npm run ci:verify-bundle
npm run ci:check:edge
npm run ci:smoke:replies
```

### Revisões adicionais

1. buscar `OPENAI_API_KEY`, `CODEX_API_KEY`, Gemini e endpoints da OpenAI no diff;
2. provar que nenhum valor de secret foi adicionado;
3. buscar caminhos do portal de membros;
4. revisar `package.json` contra a versão limpa do novo worktree;
5. executar secret scanner disponível;
6. conferir logs e screenshots por PII;
7. conferir dependências e licenças novas;
8. confirmar ausência de deploy, migration aplicada ou OAuth executado;
9. testar rollback local desligando a feature flag e o worker.
10. localizar a política de privacidade existente e preparar, sem publicar, uma proposta que informe uso da YouTube API e processamento pelo Codex;
11. confirmar que essa proposta não altera o portal de membros.

### Evidência

Criar:

```text
docs/commercial-intelligence/evidence/youtube-comment-replies/11-local-validation.md
```

Registrar commit, arquivos, comandos, contagens, capturas, limitações e diff de escopo.

### Gate de conclusão local

- suíte verde;
- smoke verde;
- zero secret;
- zero portal de membros;
- zero chamada externa não autorizada;
- diff pronto para apresentação a Bruno.

## Tarefa 12 — G2 e modo sombra com vinte comentários

Antes de agir, apresentar:

- migration e Edge Functions a aplicar;
- funções e frontend a publicar;
- dados enviados ao Codex por comentário;
- máximo de vinte gerações iniciais e vinte regenerações;
- impacto na franquia ChatGPT;
- ausência de API paga;
- política de retenção;
- texto e URL propostos para a política de privacidade e tratamento de dados;
- rollback.

Depois de G2:

1. aplicar migration e funções pelo fluxo existente;
2. publicar a política aprovada fora do portal de membros;
3. publicar a aba privada sem habilitar OAuth de escrita;
4. autenticar o worker no Supabase;
5. sincronizar vinte comentários históricos recentes de vídeos longos;
6. gerar rascunhos;
7. Bruno revisa sem publicar;
8. calcular taxa de aprovação, edição pequena, reescrita e bloqueio;
9. corrigir prompt, corpus e linter;
10. repetir somente os itens necessários dentro do teto aprovado;
11. registrar `12-shadow-pilot.md`.

### Critérios para G3

- 100% dos links corretos;
- zero publicação;
- zero violação clínica ou de segurança;
- zero similaridade acima de 50%;
- pelo menos 80% aproveitáveis sem reescrita grande;
- worker estável e sem fallback pago.

## Tarefa 13 — G3, OAuth de resposta e cinco publicações

Antes de agir, apresentar:

- cliente Google usado;
- escopo OAuth solicitado;
- local exato de armazenamento;
- confirmação de que `YOUTUBE_REFRESH_TOKEN` de Analytics não será alterado;
- cinco comentários e textos finais;
- quota prevista de inserção e leituras de verificação;
- rollback e revogação.

Depois de G3:

1. executar consentimento OAuth local;
2. armazenar token no cofre nativo;
3. confirmar que Analytics continua funcionando;
4. publicar uma resposta;
5. readback pela API;
6. conferir a resposta numa sessão sem login;
7. repetir individualmente até cinco;
8. confirmar o destino dos links com requisição `HEAD`, desde que o comportamento vigente continue sem gravar clique, e não executar `GET` artificial na campanha;
9. registrar IDs, hashes, visibilidade e erros em `13-publish-pilot.md`;
10. revogar token se houver comportamento inesperado.

Nenhuma sexta resposta é publicada sem revisão do piloto.

## Tarefa 14 — G4 e operação controlada

Depois de G4:

- ativar inbox de novos comentários;
- liberar histórico em lotes de cinquenta;
- manter sincronização manual na V1;
- manter concorrência um;
- manter publicação individual;
- acompanhar consumo do plano, taxa de edição, bloqueios e moderação do YouTube;
- revisar corpus e regras após cada cem respostas publicadas;
- considerar sincronização periódica somente em um novo desenho e nova autorização.

## Ordem de execução resumida

```text
G0
  -> worktree e baseline
  -> spike Codex
G1
  -> três chamadas históricas
  -> contratos e testes puros
  -> migration e API local
  -> worker, YouTube client, prompt e UI
  -> smoke e validação local
G2
  -> modo sombra com vinte comentários
G3
  -> OAuth e cinco publicações
G4
  -> novos comentários e lotes de cinquenta
```

## Critério de conclusão do projeto

O projeto termina quando:

- a inbox privada funciona para novos e históricos sem Shorts;
- o Codex usa autenticação ChatGPT confirmada;
- nenhum caminho de API paga existe;
- voz, segurança e link `-r` passam pelos validadores;
- Bruno controla cada publicação;
- cinco respostas reais foram confirmadas pela API e fora da sessão do canal;
- lotes de cinquenta podem ser gerados sem publicação em massa;
- testes, evidências, privacidade e rollback estão documentados;
- portal de membros, Analytics, Hotmart e campanhas atuais permanecem intactos.
