# Evidência de produção — visão comercial agregada

Data: 2026-07-13

Domínio: `https://opensquad-commercial-intelligence.pages.dev`

Projeto Supabase: `vdaualgktroizsttbrfh`

## Publicação da Edge Function

Função publicada:

```text
ci-overview
```

Resultado da CLI:

```json
{"project_ref":"vdaualgktroizsttbrfh","functions":["ci-overview"],"message":"Deployed Functions."}
```

Controles remotos sem sessão:

```json
[
  {"name":"unauth","status":401,"code":"unauthorized"},
  {"name":"wrong_method","status":405,"code":"method_not_allowed"},
  {"name":"preflight","status":204,"allowOrigin":"https://opensquad-commercial-intelligence.pages.dev"}
]
```

Smoke autenticado direto no endpoint:

```json
{
  "status": 200,
  "ok": true,
  "role": "admin",
  "currency": "BRL",
  "totals": {
    "gross": 15333.03,
    "fees": 1589.97,
    "netAfterFees": 13743.06,
    "sales": 135,
    "buyers": 90,
    "averageTicket": 101.8,
    "refunds": 6,
    "refundGross": 613.02,
    "chargebacks": 0,
    "chargebackGross": 0,
    "cancellations": 14
  },
  "products": 4,
  "dailyDays": 13,
  "warnings": [],
  "sessionRevoked": true
}
```

## Publicação Cloudflare Pages

A primeira tentativa com o token customizado salvo retornou `Authentication error 10000`; nenhum frontend foi publicado nessa tentativa. A sessão OAuth já existente do Wrangler foi verificada com permissão `pages (write)` e usada no retry.

Deployment criado:

```text
https://9d424aae.opensquad-commercial-intelligence.pages.dev
```

O domínio estável e o deployment serviram o mesmo artefato:

```text
/assets/index-CZgh9IC2.js
```

Verificações ASCII do bundle remoto:

```json
{
  "ciOverview": true,
  "quality": true,
  "availableCurrencies": true,
  "requiredDailyPace": true
}
```

## Smoke autenticado do frontend publicado

Comando:

```text
npm run ci:smoke:overview:production
```

O script gera uma sessão temporária sem senha, injeta a sessão somente no navegador headless, abre o domínio estável e revoga a sessão ao terminar.

Resultado final:

```json
{
  "ok": true,
  "appStatus": "authenticated",
  "desktopOverflowPx": 0,
  "mobileOverflowPx": 0,
  "kpiCount": 5,
  "hasNetAfterFees": true,
  "hasProducts": true,
  "hasQualityTab": true,
  "sessionRevoked": true
}
```

Capturas reais de produção:

- `commercial-overview/production-desktop-1366.png`;
- `commercial-overview/production-mobile-390.png`.

## Correção após inspeção visual

O primeiro smoke revelou `&amp;` no nome de um produto Hotmart. Foi adicionada decodificação server-side de entidades HTML para texto simples, com teste de regressão. A função foi republicada e o smoke final confirmou `Autismo & Superdotação (2AS)` no frontend real.

Teste específico final:

```text
6 testes, 6 aprovados, 0 falhas
```

`npm run typecheck` e `npm run ci:check:edge` também foram aprovados depois da correção.

## Alterações externas realizadas

- publicação da Edge Function `ci-overview`;
- publicação do frontend no projeto Cloudflare Pages existente.

Não houve:

- mudança de credencial ou secret;
- migration ou alteração de schema;
- mudança em webhook;
- mudança em Cron;
- alteração no portal de membros;
- chamada de API paga.
