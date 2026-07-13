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
- Nenhum webhook ou Cron foi ativado nesta etapa.
- Nenhuma mudança foi publicada no portal de membros.
- Login real, execução remota e tempos das sincronizações dependem da ativação do projeto Supabase e do Cloudflare Pages.
