# Evidência de produção: campanhas agrupadas por vídeo

Data: 2026-07-14

Escopo autorizado: publicar somente o novo visual do frontend da Inteligência Comercial.

Commit publicado: `bfd1492a`

## Deployment

- projeto: `opensquad-commercial-intelligence`;
- branch de produção: `main`;
- URL estável: `https://opensquad-commercial-intelligence.pages.dev`;
- deployment imutável: `https://b3eeca06.opensquad-commercial-intelligence.pages.dev`;
- asset JavaScript: `/assets/index-BAKQfqUF.js`;
- asset CSS: `/assets/index-CVPFpdCp.css`.

O deployment anterior `088d40c7` permanece disponível para rollback.

## Configuração pública do build

O bundle foi reconstruído com a mesma URL Supabase e a mesma publishable key pública presentes no deployment anterior.

Validações:

```text
url_match=True
publishable_match=True
generic_key_absent=True
```

A variável local genérica `SUPABASE_KEY` não correspondia à publishable key do frontend e não foi usada. Nenhum valor foi impresso, persistido ou alterado.

## Verificação do bundle

```text
npm run ci:verify-bundle
{"ok":true,"files":3,"bytes":847255,"secretChecks":7}
```

O Vite registrou apenas o aviso não bloqueante já conhecido sobre o chunk JavaScript acima de 500 kB.

## Verificação da publicação

A URL estável e o deployment imutável foram consultados após a publicação.

```text
stable_js=/assets/index-BAKQfqUF.js
stable_css=/assets/index-CVPFpdCp.css
js_hash_match=True
css_hash_match=True
immutable_references_js=True
```

Os hashes SHA-256 dos assets servidos pela URL estável correspondem aos arquivos locais publicados.

## Smoke público no navegador

Chrome headless abriu a URL estável e executou a aplicação:

```json
{"status":200,"heading":true,"login":true,"pageErrors":[]}
```

Foram confirmados:

- HTTP 200;
- título `Inteligência Comercial` visível;
- formulário de login visível;
- nenhum erro JavaScript não tratado.

## Limite deliberado do smoke

Não foi criada uma sessão administrativa temporária. O smoke autenticado anterior cria uma campanha técnica, registra um clique e depois remove ambos; esse comportamento ficou fora da autorização atual, que pediu apenas a publicação do visual.

A confirmação visual da área autenticada deve ser feita pela sessão já existente do usuário, atualizando a página e abrindo `Rastreamento`.

## Sistemas preservados

Não foram alterados:

- campanhas ou links;
- cliques ou atribuições;
- banco e migrations;
- Supabase Edge Functions;
- webhook Hotmart;
- credenciais ou secrets;
- portal de membros;
- landing page do MAPA-7P;
- Worker `mapa7p-link-router`;
- DNS ou domínio próprio.

## Rollback

Em caso de regressão visual, restaurar o deployment de produção anterior `088d40c7`. Como a publicação foi somente de assets estáticos, não há rollback de dados.
