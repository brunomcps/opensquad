# Evidência local — ponte SCK da landing page do MAPA-7P

Data: 2026-07-15

Escopo: implementação local, sem publicação e sem alteração da landing page.

## Artefato

- Fonte do script: `server/scripts/commercial-intelligence/hotmart-pages-mapa7p-tracking-v1.js`
- Versão interna: `1.0.0`
- Destino permitido: somente `https://pay.hotmart.com/K103806991N`
- Origem do código: `sck`; fallback para `utm_term`
- Código aceito: 1–30 caracteres, apenas letras, números, pipe (`|`) e hífen (`-`); underline é rejeitado.
- UTMs copiadas: `utm_source`, `utm_medium`, `utm_campaign`, `utm_content` e `utm_term`.

## Comportamento de segurança

1. Preserva `off`, `checkoutMode`, `hotfeature`, demais parâmetros existentes e fragmento.
2. Não altera links de outros produtos, hosts parecidos, protocolo HTTP ou URLs inválidas.
3. Não copia parâmetros fora da allowlist.
4. Observa anchors inseridos ou alterados depois da carga inicial.
5. Em qualquer erro de URL, DOM ou `MutationObserver`, mantém o checkout original navegável.
6. A instalação repetida da mesma versão é idempotente.

## Base Hotmart

A Central de Ajuda da Hotmart documenta o `SCK` no checkout do produtor, o limite de 30 caracteres, o uso de pipe e a proibição de underline:

https://help.hotmart.com/pt-br/article/216441797/como-identificar-a-origem-das-minhas-vendas-na-hotmart-

A documentação do Hotmart Pages orienta inserir o trecho completo `<script>` no campo `Body`. Para publicar, o conteúdo do arquivo deve ser envolvido por `<script>` e `</script>`:

https://help.hotmart.com/pt-br/article/43449924104205/como-associar-uma-pagina-do-hotmart-pages-como-pagina-de-vendas-do-meu-produto-

## Teste automatizado executado

Comando:

```powershell
node --import tsx --test server/scripts/commercial-intelligence/hotmart-pages-mapa7p-tracking-v1.test.ts
```

Resultado em 2026-07-15:

```text
tests 6
pass 6
fail 0
duration_ms 606.1038
```

Cobertura confirmada:

- validação positiva e negativa do código;
- preservação dos parâmetros do checkout;
- allowlist de UTM;
- fallback por `utm_term`;
- isolamento por produto, host e protocolo;
- DOM inicial e DOM tardio;
- falha aberta.

Validações adicionais:

```text
node --check: passou
git diff --check: passou
npm run typecheck: passou
npm test: 137 testes passaram, 0 falharam
```

## Limite desta evidência

O teste comprova o comportamento local do script. Ele não comprova instalação no Hotmart Pages nem atribuição de uma venda real. Essas duas confirmações exigem publicação autorizada e teste posterior no ambiente real.
