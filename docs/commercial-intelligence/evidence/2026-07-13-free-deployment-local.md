# Evidências locais — aplicação privada gratuita

Data: 2026-07-13

## Escopo verificado

- Aplicação Vite dedicada à Inteligência Comercial.
- Autenticação por e-mail e senha com Supabase Auth.
- Associação privada por `ci_app_members`, com papéis `viewer` e `admin`.
- Funções Supabase Edge para qualidade, sincronização YouTube, reconciliação Hotmart e webhook Hotmart.
- Build independente do portal de membros e das demais áreas do Content Hub.
- Configuração de Cloudflare Pages e scripts de Cron preparados, mas ainda não ativados em produção nesta etapa.

## Verificação automatizada

Comando executado:

```text
npm run ci:check
```

Resultado:

```text
52 testes aprovados, 0 falhas
TypeScript: exit code 0
Build Vite dedicado: concluído
Bundle: 397272 bytes em 3 arquivos
Verificação de segredos no bundle: 7 verificações, nenhuma exposição
Deno check: 4 Edge Functions aprovadas
```

## Smoke visual

Comando executado com o servidor Vite local e variáveis públicas fictícias:

```text
npm run ci:smoke:visual
```

Resultado:

```json
{"ok":true,"browser":"chrome.exe","desktop":"login-desktop.png","mobile":"login-mobile.png","mobileOverflowPx":0}
```

Capturas inspecionadas:

- `free-deployment/login-desktop.png`
- `free-deployment/login-mobile.png`

## Limites desta evidência

- Nenhuma credencial foi adicionada ao repositório ou ao bundle.
- Nenhuma mudança foi publicada no portal de membros.
- Nenhum webhook ou Cron foi ativado nesta etapa.

## Ativação remota

Frontend publicado em:

```text
https://opensquad-commercial-intelligence.pages.dev
```

O domínio estável foi aberto em navegador e apresentou somente a tela de login com título, campos de e-mail e senha, botão de entrada e recuperação de senha.

Supabase:

- projeto vinculado: `content-hub` (`vdaualgktroizsttbrfh`);
- migration aditiva aplicada pela Management API;
- tabelas verificadas: `ci_app_members` e `ci_sync_locks`;
- nove secrets de integração configurados nas Edge Functions;
- dois secrets configurados no Vault;
- quatro Edge Functions publicadas.

Smoke remoto de segurança:

```text
ci-quality sem sessão: 401
ci-sync-hotmart sem sessão: 401
ci-sync-youtube sem sessão: 401
ci-hotmart-webhook sem HOTTOK: 401
preflight com origem não autorizada: 403
preflight com origem publicada: 204
```

Pendências deliberadas:

- concluir a definição de senha pelo convite enviado ao primeiro administrador;
- validar o login ponta a ponta depois que o administrador definir a senha.

## Ativação final

Primeiro administrador:

```text
e-mail: contact@brunosalles.com
papel: admin
enabled: true
convite: enviado
```

Sincronização YouTube:

```json
{"status":"partial","rowsRead":800,"rowsWritten":800,"videosWritten":59,"sourceWatermark":"2026-07-09","warnings":["youtube_missing_days:15"],"durationMs":6714}
```

O estado `partial` representa os 15 dias sem linhas retornadas pela fonte. As 800 linhas recebidas foram persistidas, cobrindo 59 vídeos entre 2026-06-09 e 2026-07-09.

Reconciliação Hotmart:

```json
{"status":"success","rowsRead":556,"rowsWritten":3,"rowsSkipped":553,"repairs":0,"warnings":[],"durationMs":23785}
```

Verificação posterior:

```text
transações Hotmart: 556
buyer_key preenchido: 556
cobertura anonimizada: 100%
```

Cron ativado:

```text
ci-youtube-daily: 10 9 * * *, active=true
ci-hotmart-daily: 40 9 * * *, active=true
```

Os horários correspondem a 06:10 e 06:40 em America/Sao_Paulo enquanto o fuso estiver em UTC-3.

Webhook Hotmart:

```text
nome: Inteligência Comercial
escopo: todos os produtos
versão: 2.0.0
eventos: compra cancelada, completa, aprovada, reembolsada e chargeback
status: ativo
```

Antes do cadastro, o endpoint recebeu uma requisição autenticada com HOTTOK real e payload vazio. A resposta foi `400 invalid_hotmart_payload`, confirmando autenticação e validação sem persistir dado sintético.

## Validação final de autenticação

O primeiro convite não havia sido concluído: a conta existia, mas ainda não tinha e-mail confirmado nem login registrado. Foi gerado um link único de recuperação pela API administrativa da Supabase, sem expor senha, token ou link no repositório ou nesta evidência.

Após o administrador definir a nova senha, a verificação remota retornou:

```text
usuário encontrado: true
e-mail confirmado: true
login registrado: true
associação encontrada: true
papel: admin
enabled: true
```

O endpoint público de recuperação também aceitou uma nova solicitação com `ok: true`, usando como destino `https://opensquad-commercial-intelligence.pages.dev`.
