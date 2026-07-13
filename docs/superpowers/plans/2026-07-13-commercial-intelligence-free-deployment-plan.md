# Plano de implementação: Inteligência Comercial gratuita e privada

Referência: `docs/superpowers/specs/2026-07-13-commercial-intelligence-free-deployment-design.md`

## Princípios de execução

- Manter o portal de membros e as demais áreas do Content Hub fora do diff.
- Fazer mudanças de banco apenas por migrations aditivas e idempotentes.
- Não registrar segredo, token ou PII em código, teste, log ou evidência.
- Validar localmente antes de alterar Auth, Secrets, Cloudflare, Cron, webhook ou produção.
- Preservar a lógica e os testes existentes das Fases 0 e 1.
- Só cadastrar o webhook depois de o endpoint público passar no smoke test.

## Etapa 1 — aplicação dedicada

1. Criar `ci-app/` com HTML, entrypoint React, shell, login e estilos próprios.
2. Criar configuração Vite com output `dist-ci/`.
3. Reutilizar `CommercialIntelligenceView`, `DataQualityTab`, tipos e tokens visuais.
4. Criar cliente Supabase público usando somente URL e publishable key.
5. Adicionar sessão, login, recuperação de senha, logout e estados de acesso negado.
6. Adicionar build e preview exclusivos no `package.json`.

Verificação:

```text
npm run ci:build:web
npm run typecheck
```

## Etapa 2 — schema de acesso e concorrência

1. Criar migration `002-edge-app.sql`.
2. Adicionar `ci_app_members` com papéis `viewer` e `admin`.
3. Ativar RLS e restringir grants.
4. Adicionar `ci_sync_locks` e RPCs de aquisição/liberação com expiração.
5. Adicionar testes estáticos da migration para aditividade, RLS e grants.
6. Estender verificação de migration sem depender de `exec_sql`.

Verificação:

```text
npm test
npm run ci:migrate -- --verify
```

## Etapa 3 — núcleo Edge compartilhado

1. Criar contratos, datas, HTTP/CORS, Web Crypto, autorização e repositório em `_shared/`.
2. Portar normalização Hotmart usando Web Crypto.
3. Portar adaptador Hotmart com `fetch`.
4. Portar adaptador YouTube com OAuth e REST, sem `googleapis`.
5. Criar testes Node para módulos puros e paridade das fixtures.

Verificação:

```text
npm test
npm run typecheck
```

## Etapa 4 — Edge Functions

1. Implementar `ci-quality`.
2. Implementar `ci-hotmart-webhook`.
3. Implementar `ci-sync-hotmart`.
4. Implementar `ci-sync-youtube`.
5. Configurar `verify_jwt = false` e aplicar validação explícita em cada função.
6. Sanitizar respostas e logs.
7. Aplicar trava por fonte nas sincronizações.

Verificação:

```text
npm test
deno check supabase/functions/*/index.ts
```

Se Deno não estiver disponível, usar o comando de verificação da Supabase CLI e registrar a limitação local.

## Etapa 5 — integração do frontend

1. Criar cliente da API de funções com JWT da sessão.
2. Adaptar o store para aceitar o novo transporte sem quebrar o Content Hub local.
3. Exibir permissões do usuário e ações manuais somente para admin.
4. Tratar `401`, `403`, `409`, `503` e sessão expirada.
5. Adicionar varredura do bundle para impedir segredos.

Verificação:

```text
npm run ci:build:web
npm run ci:verify-bundle
npm test
npm run typecheck
```

## Etapa 6 — Cron e deploy declarativo

1. Criar SQL de ativação do Vault e dos dois jobs Cron sem valores secretos.
2. Criar SQL de desativação/rollback dos jobs.
3. Adicionar configuração e runbook do Cloudflare Pages.
4. Documentar nomes de Secrets, URLs e ordem de ativação.
5. Garantir que Railway não seja chamada por nenhum fluxo novo.

## Etapa 7 — validação local completa

1. Rodar todos os testes existentes e novos.
2. Rodar typecheck e os dois builds.
3. Testar login e tela dedicada com mocks controlados.
4. Testar funções localmente com fixtures.
5. Registrar evidência sem credenciais.

## Etapa 8 — ativação externa

1. Auditar o Supabase Auth compartilhado antes de qualquer configuração global.
2. Aplicar migration aditiva.
3. Configurar Secrets e Vault.
4. Publicar as quatro Edge Functions.
5. Criar o primeiro usuário e associação admin.
6. Publicar preview no Cloudflare Pages.
7. Executar testes de autenticação e integração reais.
8. Publicar produção e testar desktop/mobile.
9. Confirmar duração inferior a 100 segundos para cada sync.
10. Registrar/testar o webhook Hotmart.
11. Ativar Cron e observar uma execução de cada fonte.
12. Registrar evidência final e procedimento de rollback.

## Critério de parada segura

Se uma função ultrapassar 100 segundos, se o Auth compartilhado puder ser afetado, se o bundle contiver segredo ou se o endpoint público falhar, a ativação para antes de Cron e webhook. Código e migrations permanecem disponíveis para correção sem apagar dados existentes.
