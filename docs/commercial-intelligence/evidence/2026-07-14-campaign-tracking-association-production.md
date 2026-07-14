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
