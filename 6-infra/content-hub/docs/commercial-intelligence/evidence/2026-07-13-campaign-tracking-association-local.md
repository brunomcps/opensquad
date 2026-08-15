# Evidência local — campanhas, atribuição e associação

Data: 2026-07-13

Escopo: implementação local das frentes de rastreamento direto e associação histórica. Nenhuma migration foi aplicada no Supabase e nenhum deploy foi executado.

## Estado de dados antes da implementação

Leitura agregada e sem identificadores individuais realizada no Supabase de produção antes desta implementação:

- transações existentes: 556;
- transações com `tracking_src`: 0;
- transações com `tracking_sck`: 0;
- transações com `tracking_xcod`: 0;
- conclusão: o histórico atual não permite atribuição direta; vendas futuras precisam usar os links gerados pela nova funcionalidade.

## Verificação automatizada

Comando:

```text
npm run ci:check
```

Resultado:

- 72 testes executados;
- 72 testes aprovados;
- 0 falhas;
- `tsc -b` aprovado;
- bundle dedicado construído com sucesso;
- verificação de sete nomes/valores de secrets no bundle aprovada;
- nove Supabase Edge Functions aprovadas pelo `deno check`.

Cobertura nova validada:

- código de campanha com até 30 caracteres e sem `_`;
- link preservando `SCK`/`SRC` e UTMs;
- URL restrita a HTTP/HTTPS;
- clique sem IP e referer reduzido ao hostname;
- bots separados de cliques humanos;
- atribuição apenas para código conhecido;
- conflito de códigos sem crédito duplo;
- venda sem origem mantida como não atribuída;
- baseline por mesmos dias da semana;
- janela de 14 dias sem contaminar o baseline com dias posteriores à publicação;
- publicação sem baseline ou janela completa marcada como insuficiente;
- migration aditiva com RLS e sem `DROP`.

## Migration

Comando:

```text
npm run ci:migrate
```

Resultado:

```json
{"ok":true,"mode":"check","migrations":[{"name":"001-base.sql","bytes":9840},{"name":"20260713180000_ci_edge_app.sql","bytes":3136},{"name":"20260713230000_ci_campaign_tracking.sql","bytes":2968}]}
```

O modo foi `check`; nenhuma instrução foi executada no banco.

## Smoke visual

Comando:

```text
npm run ci:smoke:decisions
```

Resultado:

- Chrome headless;
- overflow horizontal desktop: 0 px;
- overflow horizontal mobile: 0 px;
- quatro abas visíveis;
- navegação desktop: 43 px de altura;
- navegação mobile: 80 px de altura;
- rótulo `Atribuição direta` verificado;
- rótulo `Associação temporal exploratória` verificado;
- links direto e rastreável renderizados;
- ranking histórico legível em cards no mobile.

Capturas:

- `campaign-tracking-association/desktop-1366-tracking-top.png`
- `campaign-tracking-association/desktop-1366-tracking-campaigns.png`
- `campaign-tracking-association/desktop-1366-association-top.png`
- `campaign-tracking-association/desktop-1366-association-ranking.png`
- `campaign-tracking-association/mobile-390-tracking-top.png`
- `campaign-tracking-association/mobile-390-tracking-campaigns.png`
- `campaign-tracking-association/mobile-390-association-top.png`
- `campaign-tracking-association/mobile-390-association-ranking.png`

## Limitação registrada

O script read-only `npm run ci:validate:decisions` foi executado, mas parou antes de consultar o banco porque `SUPABASE_SERVICE_ROLE_KEY` não está disponível no ambiente local. Nenhuma credencial foi procurada, copiada ou alterada. A validação com dados reais deve ser feita após a migration e as funções serem publicadas, usando o endpoint autenticado.

## Gate de produção

Ainda dependem de autorização explícita:

1. aplicar `20260713230000_ci_campaign_tracking.sql` no Supabase;
2. publicar `ci-campaigns`, `ci-attribution`, `ci-association` e `ci-campaign-redirect`;
3. publicar o novo bundle no Cloudflare Pages;
4. executar smoke autenticado contra produção.

Não foram alterados:

- portal de membros;
- credenciais ou secrets;
- webhook Hotmart;
- cron;
- configuração de domínio;
- dados de produção.
