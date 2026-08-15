# Evidência de produção — ponte SCK do MAPA-7P

Data da validação: 2026-07-15 15:03 BRT

## Escopo implantado

- Hotmart Pages, página `MAPA`: script `OpenSquad MAPA-7P SCK bridge v1` adicionado ao `Body` e publicado.
- O script existente `Google Ads`, no `Head`, não foi alterado.
- Supabase Edge Function `ci-campaign-redirect`: versão 8, status `ACTIVE`.
- Supabase Edge Function `ci-campaigns`: versão 8, status `ACTIVE`.
- Nenhuma credencial, segredo, webhook ou configuração do Cloudflare Worker foi alterada.

## Comportamento implantado

1. O link curto entrega o código da campanha nos parâmetros `src` e `sck` ao HotLink.
2. O HotLink da Hotmart preserva `sck` ao encaminhar para a landing page.
3. O script da landing copia o `sck` para os links do checkout do MAPA-7P.
4. O checkout recebe o mesmo código que identifica vídeo e posição do CTA.

## Validação local

```text
Teste focado da ponte: 6 passaram, 0 falharam
Teste focado de campanhas + ponte: 13 passaram, 0 falharam
npm test: 137 passaram, 0 falharam
npm run typecheck: passou
npm run ci:check:edge: passou
node --check: passou
git diff --check: passou
```

Foi verificado também que o conteúdo interno do script não contém a sequência de fechamento de elemento HTML, evitando encerramento prematuro quando envolvido pelo elemento `script` do Hotmart Pages.

## Smoke test de produção

### Links curtos

Foram enviados apenas requests `HEAD`, que não registram clique, para as três posições do vídeo-piloto:

```text
0okxyzoxzuk-d -> 302; src e sck presentes e idênticos
0okxyzoxzuk-c -> 302; src e sck presentes e idênticos
0okxyzoxzuk-r -> 302; src e sck presentes e idênticos
```

Os parâmetros `utm_source`, `utm_medium`, `utm_campaign` e `utm_content` também permaneceram presentes.

### Hotmart, landing e checkout

Foi usado o código sintético `yt|smoke|d|test`, sem acessar um link curto real:

```text
HotLink -> landing brunosallesphd.kpages.online: sck preservado
CTAs encontrados na landing: 13
CTAs com o mesmo sck: 13 de 13
Checkout final: pay.hotmart.com/K103806991N
sck recebido pelo checkout: yt|smoke|d|test
```

Nenhuma compra foi iniciada ou concluída durante o teste.

## Limite da evidência

O teste comprova o transporte técnico do código até o checkout. A confirmação financeira definitiva depende de uma próxima compra real chegar da Hotmart com esse `sck` e ser associada pela Inteligência Comercial.
