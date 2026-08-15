# Runbook — Inteligência Comercial no Cloudflare Pages e Supabase

## Escopo

Este runbook publica somente a Inteligência Comercial. Ele não altera o portal de membros nem as demais áreas do Content Hub.

## Artefatos

- Frontend: `ci-app/`
- Build estático: `dist-ci/`
- Edge Functions: `supabase/functions/`
- Migration de acesso e travas: `supabase/migrations/20260713180000_ci_edge_app.sql`
- Ativação Cron: `supabase/cron/activate.sql`
- Rollback Cron: `supabase/cron/rollback.sql`

## Variáveis públicas do frontend

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Somente essas duas variáveis podem entrar no build. Nenhuma chave `service_role`, credencial de integração, HOTTOK ou segredo Cron pode usar prefixo `VITE_`.

## Secrets das Edge Functions

- `HOTMART_CLIENT_ID`
- `HOTMART_CLIENT_SECRET`
- `HOTMART_ENVIRONMENT`
- `HOTMART_HOTTOK`
- `CI_BUYER_HMAC_SECRET`
- `CI_CRON_SECRET`
- `CI_ALLOWED_ORIGINS`
- `YOUTUBE_CLIENT_ID`
- `YOUTUBE_CLIENT_SECRET`
- `YOUTUBE_REFRESH_TOKEN`

`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` são disponibilizados pelo runtime hospedado. Valores secretos devem ser enviados por arquivo temporário restrito ou pelo painel; nunca entram em comando versionado, log ou evidência.

## Vault

Criar, sem registrar os valores:

- `ci_project_url`: URL do projeto Supabase;
- `ci_cron_secret`: mesmo valor configurado em `CI_CRON_SECRET` nas funções.

## Validação local

```text
npm test
npm run typecheck
npm run ci:build:web
npm run ci:verify-bundle
```

Quando a Supabase CLI estiver disponível:

```text
npx supabase functions serve --env-file <arquivo-temporario>
```

Testar fixtures de webhook, autorização ausente, viewer, admin, segredo Cron e execução concorrente.

## Deploy das Edge Functions

Depois de autenticar a Supabase CLI e vincular o projeto:

```text
npx supabase functions deploy ci-quality
npx supabase functions deploy ci-hotmart-webhook
npx supabase functions deploy ci-sync-hotmart
npx supabase functions deploy ci-sync-youtube
```

Todas usam validação explícita; `verify_jwt` permanece `false` no gateway para permitir o webhook e o segredo Cron, sem tornar as funções privadas públicas.

## Cloudflare Pages

Configuração do projeto:

- comando de build: `npm run ci:build:web`;
- diretório de saída: `dist-ci`;
- variáveis: somente as duas `VITE_*` públicas;
- nome sugerido: `opensquad-commercial-intelligence`.

O preview precisa passar por login Supabase e associação ativa antes da promoção para produção.

## Primeiro usuário

1. Criar o usuário por operação administrativa do Supabase Auth.
2. Confirmar o e-mail administrativamente ou pelo fluxo de e-mail.
3. Inserir o `user_id` em `ci_app_members` com papel `admin`.
4. Não alterar usuários ou configurações do portal de membros.

## Ativação

1. Aplicar `supabase/migrations/20260713180000_ci_edge_app.sql`.
2. Configurar Secrets e Vault.
3. Publicar as quatro funções.
4. Criar o usuário admin.
5. Publicar preview do Pages.
6. Testar login, qualidade, permissões e sincronizações.
7. Confirmar cada sync abaixo de 100 segundos.
8. Promover o Pages para produção.
9. Testar o endpoint Hotmart com fixture controlada e HOTTOK real.
10. Registrar o webhook na Hotmart.
11. Aplicar `supabase/cron/activate.sql`.
12. Observar uma execução YouTube e Hotmart.

## Rollback

1. Aplicar `supabase/cron/rollback.sql`.
2. Desativar o webhook novo na Hotmart.
3. Retirar ou reverter o deployment do Cloudflare Pages.
4. Manter funções, tabelas e dados para diagnóstico.

O rollback não apaga dados comerciais.
