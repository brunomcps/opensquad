# Evidência de produção — campanhas, atribuição e associação

Data: 2026-07-14

Escopo: ativação em produção do rastreamento de campanhas, atribuição direta e associação temporal no aplicativo privado de Inteligência Comercial.

## Banco de dados

A migration aditiva `20260713230000_ci_campaign_tracking.sql` foi aplicada ao projeto Supabase `vdaualgktroizsttbrfh` com `supabase db query --linked`.

Verificação posterior:

- `ci_campaigns` criada com RLS ativo;
- `ci_click_events` criada com RLS ativo;
- nenhuma operação destrutiva executada;
- nenhuma transação Hotmart ou métrica do YouTube alterada.

O histórico remoto de migrations já continha versões antigas ausentes neste checkout. Não foi executado `migration repair`, nem feita reescrita do histórico. A nova migration foi aplicada diretamente para evitar uma alteração ampla e não relacionada.

## Supabase Edge Functions

Publicadas e verificadas como `ACTIVE`, versão 1:

- `ci-campaigns`;
- `ci-attribution`;
- `ci-association`;
- `ci-campaign-redirect`.

Controles negativos confirmados:

- acesso sem sessão a `ci-campaigns`: HTTP 401;
- redirecionamento sem campanha válida: HTTP 404.

## Cloudflare Pages

Bundle final publicado em:

- URL estável: `https://opensquad-commercial-intelligence.pages.dev`;
- deployment imutável final: `https://cae883b0.opensquad-commercial-intelligence.pages.dev`;
- asset JavaScript servido pela URL estável: `assets/index-DmGEFzJu.js`.

A primeira tentativa com o token customizado presente no ambiente retornou erro de autenticação 10000 e não publicou arquivos. A publicação foi repetida pela sessão OAuth já autenticada do Wrangler, sem alterar ou substituir credenciais.

## Smoke autenticado ponta a ponta

Comando:

```text
npm run ci:smoke:decisions:production
```

Fluxo executado:

1. criou sessão temporária para o membro administrador existente;
2. carregou 63 vídeos e 4 produtos reais do catálogo;
3. criou uma campanha temporária com destino neutro em `example.com`;
4. acessou o link rastreável sem seguir para o destino;
5. confirmou HTTP 302 com `sck` e UTMs no destino;
6. confirmou 1 clique humano na campanha;
7. confirmou o mesmo clique na visão de atribuição direta;
8. confirmou 0 vendas atribuídas, como esperado para o teste sem compra;
9. abriu as visões reais em Chrome headless, desktop e mobile;
10. apagou o clique e a campanha temporários;
11. revogou a sessão temporária.

Resultado final:

```json
{"ok":true,"appStatus":"authenticated","memberRole":"admin","catalogVideos":63,"catalogProducts":4,"initialCampaigns":0,"redirectStatus":302,"humanClicks":1,"attributedClicks":1,"attributedSales":0,"attributionCoverage":0,"associationVideosPublished":29,"associationVideosAnalyzed":2,"associationRows":2,"desktopOverflowPx":0,"mobileOverflowPx":0,"desktopNavHeight":43,"mobileNavHeight":80,"visibleTabs":4,"productLabelDecoded":true,"unauthenticatedCampaignsStatus":401,"missingRedirectStatus":404,"temporaryDataRemoved":true,"sessionRevoked":true}
```

Verificação independente após o smoke:

- campanhas temporárias restantes: 0;
- cliques temporários restantes: 0;
- RLS continuou ativo nas duas tabelas.

## Associação temporal com dados reais

O histórico Hotmart disponível em produção começa em 2026-06-10 e contém 35 dias aprovados. Com o baseline conservador de quatro semanas, ainda não havia publicação com baseline anterior e janela posterior completos em 2026-07-14.

Para não entregar uma tela vazia, a interface passou a permitir escolher 2, 4 ou 8 semanas e abre inicialmente em 2 semanas. Nesse modo foram analisados 2 de 29 vídeos publicados no período:

- 1 vídeo acima do baseline;
- 1 vídeo abaixo do baseline;
- 27 vídeos marcados como dados insuficientes.

A interface mantém o rótulo `Associação temporal exploratória` e o aviso de que a diferença observada não prova causalidade.

## Verificação automatizada completa

Comando:

```text
npm run ci:check
```

Resultado:

- 72 testes executados;
- 72 aprovados;
- 0 falhas;
- `tsc -b` aprovado;
- bundle de produção aprovado;
- 7 verificações de secrets no bundle aprovadas;
- 9 Edge Functions aprovadas pelo `deno check`.

Aviso não bloqueante: o bundle JavaScript possui aproximadamente 810 kB e o Vite recomenda divisão futura de chunks.

## Evidência visual

- `campaign-tracking-association-production/production-desktop-1366-tracking-top.png`
- `campaign-tracking-association-production/production-desktop-1366-tracking-campaigns.png`
- `campaign-tracking-association-production/production-desktop-1366-association-top.png`
- `campaign-tracking-association-production/production-desktop-1366-association-result.png`
- `campaign-tracking-association-production/production-mobile-390-tracking-top.png`
- `campaign-tracking-association-production/production-mobile-390-tracking-campaigns.png`
- `campaign-tracking-association-production/production-mobile-390-association-top.png`
- `campaign-tracking-association-production/production-mobile-390-association-result.png`

## Alterações deliberadamente não realizadas

- credenciais ou secrets;
- webhook Hotmart;
- portal de membros;
- cron;
- configuração de domínio;
- compras ou vendas de teste;
- chamadas a APIs pagas.

## Estado operacional

A associação histórica já mostra dados reais. A atribuição direta está operacional, mas sua cobertura continuará em 0% até que os novos links sejam usados nos CTAs e a Hotmart devolva o respectivo `SCK`, `SRC` ou `XCOD` em vendas futuras.

## Atualização — gerador de links MAPA-7P

Horário da publicação: 2026-07-14 16:52:44 -03:00.

Escopo autorizado nesta atualização: migration, `ci-campaigns`, `ci-campaign-redirect` e interface do aplicativo privado. DNS e campanhas reais ficaram fora do escopo.

Pré-checagem e migration:

- `ci_campaigns` tinha 0 registros e 0 códigos incompatíveis antes da alteração;
- `20260714193000_ci_campaign_comment_reply.sql` foi aplicada isoladamente com `supabase db query --linked`;
- as migrations `20260713180000`, `20260713230000` e `20260714193000` ficaram alinhadas entre histórico local e remoto;
- `ci_campaigns_cta_position_check` foi validada com `comment_reply`;
- `ci_campaigns_tracking_code_hotmart_safe_check` foi validada com `^[A-Za-z0-9|]+$`.

Edge Functions publicadas:

- `ci-campaigns`: `ACTIVE`, versão 2;
- `ci-campaign-redirect`: `ACTIVE`, versão 2;
- acesso sem sessão a `ci-campaigns`: HTTP 401;
- slug inexistente no redirect: HTTP 404;
- preflight CORS: HTTP 204.

Cloudflare Pages:

- produção: `https://opensquad-commercial-intelligence.pages.dev`;
- deployment imutável: `https://088d40c7.opensquad-commercial-intelligence.pages.dev`;
- asset: `/assets/index-DFGAWbJE.js`;
- HTML e asset responderam HTTP 200;
- `Gerador MAPA-7P`, `https://go.hotmart.com/K103806991N` e o projeto Supabase correto foram confirmados no bundle servido pela URL estável.

Verificação completa:

- `npm run ci:check`: 74 testes, 74 aprovados e 0 falhas;
- `tsc -b`: aprovado;
- bundle: 3 arquivos, 836.906 bytes e 7 verificações de secrets aprovadas;
- `deno check`: 9 Edge Functions aprovadas;
- estado posterior: `ci_campaigns=0` e `ci_click_events=0`.

Não foram alterados DNS, domínio customizado, portal de membros, webhook Hotmart, credenciais, secrets, campanhas reais, cliques, transações Hotmart ou métricas do YouTube. Nenhuma API paga foi chamada.

## Atualização — domínio próprio e piloto MAPA-7P

Horário da conclusão: 2026-07-14 17:46:14 -03:00.

Escopo aprovado: criar um Worker dedicado, ativar `link.brunosallesphd.com.br`, configurar a URL pública das campanhas e criar três links-piloto para o vídeo `0OkxYzoxzUk`.

### Implementação e validação local

- Worker isolado: `mapa7p-link-router`;
- formato público: `https://link.brunosallesphd.com.br/m7p/<slug>`;
- `HEAD` preserva o redirect sem gravar clique;
- fallback anterior do Supabase com query string preservado;
- `npm run ci:check`: 79 testes, 79 aprovados e 0 falhas;
- `tsc -b`, build Vite, 7 verificações de secrets e 9 Edge Functions aprovados;
- dry-run do Wrangler aprovado.

### Supabase

- `ci-campaigns`: `ACTIVE`, versão 4;
- `ci-campaign-redirect`: `ACTIVE`, versão 4;
- configuração pública: `CI_CAMPAIGN_REDIRECT_BASE_URL=https://link.brunosallesphd.com.br/m7p/{slug}`;
- a configuração adicionada não é credencial nem contém segredo;
- acesso anônimo a `ci-campaigns`: HTTP 401;
- `HEAD` para slug inexistente: HTTP 404.

### Cloudflare

- Worker publicado: `mapa7p-link-router`;
- version ID: `145db470-871f-48b6-be7d-68832a7d9c1b`;
- custom domain: `link.brunosallesphd.com.br`;
- DNS A e AAAA resolvendo pela Cloudflare;
- TLS validado com `ssl_verify_result=0`;
- raiz: HTTP 404;
- slug inexistente: HTTP 404;
- método POST: HTTP 405.

A primeira tentativa de deploy usou o token customizado presente no processo e falhou com erro 10000 antes de publicar. A repetição usou a sessão OAuth já autenticada do Wrangler, sem editar ou substituir credenciais.

### Piloto criado

Vídeo: `0OkxYzoxzUk — O QUE REALMENTE É TDAH (Não é uma doença)`.

| Posição | Link público | Tracking code | Estado |
| --- | --- | --- | --- |
| Descrição | `https://link.brunosallesphd.com.br/m7p/e5537092` | `yt\|0OkxYzoxzUk\|d\|165e` | active |
| Comentário fixado | `https://link.brunosallesphd.com.br/m7p/7741f0ee` | `yt\|0OkxYzoxzUk\|p\|174e` | active |
| Resposta a comentário | `https://link.brunosallesphd.com.br/m7p/de5c1a8a` | `yt\|0OkxYzoxzUk\|r\|5eff` | active |

Os três links responderam HTTP 302 para `https://go.hotmart.com/K103806991N`, com `src` distinto e UTMs. A validação `HEAD` não criou cliques. Um GET técnico adicional foi registrado exatamente uma vez como bot e removido em seguida.

Verificação independente posterior no banco:

- campanhas do piloto: 3;
- campanhas ativas: 3;
- eventos de clique residuais: 0.

### Sistemas deliberadamente preservados

- landing page do MAPA-7P;
- portal de membros;
- Worker e rota `hub.brunosallesphd.com.br`;
- webhook Hotmart;
- credenciais e chaves existentes;
- transações Hotmart e métricas do YouTube;
- APIs pagas.
