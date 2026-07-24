# Evidências de ativação — Inteligência Comercial Fases 0 e 1

Data da execução: 2026-07-13  
Ambiente de dados: Supabase de produção (`vdaualgktroizsttbrfh`)  
Ambiente de aplicação: Railway `production`, serviço `web`

## Escopo executado

- Migração aditiva aplicada no Supabase, sem alteração do portal de membros.
- Segredos de produção configurados na Railway: `SUPABASE_SERVICE_ROLE_KEY`, `CI_BUYER_HMAC_SECRET` e `HOTMART_HOTTOK`.
- Reconciliação inicial da Hotmart executada com anonimização HMAC ativa.
- Sincronização inicial do YouTube executada com descoberta pelo playlist de uploads e relatórios diários filtrados por vídeo.
- Suporte a ajustes líquidos negativos de `likes`, `comments` e `shares` aplicado no schema.
- Deploy e registro do webhook mantidos pendentes porque a Railway recusou o upload antes do build por expiração do trial.

## Evidências de dados

### Hotmart

Execução final:

```json
{"runId":"9fdee4ad-51fe-40de-a022-a1eac05132f8","status":"success","rowsRead":553,"rowsWritten":553,"rowsSkipped":0,"repairs":0,"warnings":[]}
```

Verificação posterior, sem retorno de PII:

```json
{"transactions":553,"withBuyerKey":553,"coverage":true}
```

Resultado: todas as 553 transações persistidas possuem `buyer_key` anonimizado.

### YouTube

Execução final:

```json
{"runId":"60a2f762-316a-4316-8794-5c4f8889a6eb","status":"partial","rowsRead":800,"rowsWritten":800,"videosWritten":59,"sourceWatermark":"2026-07-09","warnings":["youtube_missing_days:15"]}
```

Verificação posterior:

```json
{"dailyRows":800,"videos":62,"dateRange":{"min":"2026-06-09","max":"2026-07-09"}}
```

O status `partial` representa 15 dias sem linhas retornadas pela fonte na janela consultada; as 800 linhas recebidas foram persistidas. Dias ausentes permanecem lacunas e não são convertidos em zero.

## Correções durante a ativação

1. Uma reconciliação inicial da Hotmart foi executada sem o HMAC efetivo. O lote foi removido antes da execução final e não permaneceu na base.
2. A primeira consulta diária do YouTube não incluía filtro de vídeos, combinação não aceita pelo relatório usado. A ingestão passou a descobrir os vídeos do canal e consultar lotes filtrados.
3. A fonte retornou métricas líquidas negativas de engajamento. As restrições incompatíveis foram removidas e foi adicionado teste para preservar esses valores.

Após as correções, o estado pós-rollback foi verificado com zero registros Hotmart e zero linhas diárias YouTube antes dos backfills finais.

## Verificação automatizada final

Comandos executados em 2026-07-13:

```text
npm test
46 testes, 46 aprovados, 0 falhas

npm run typecheck
Concluído com exit code 0

npm run build
Concluído com exit code 0
```

O build emitiu somente o aviso não bloqueante do Vite sobre chunk maior que 500 kB.

## Publicação e webhook

Tentativa final de publicação:

```text
Indexing...
Uploading...
Your trial has expired. Please select a plan to continue using Railway.
```

A recusa ocorreu antes do build e nenhuma nova versão foi publicada. O webhook da Hotmart não foi registrado porque o endpoint público continua indisponível; registrar uma URL que retorna erro criaria falhas e possível desativação automática.

Próxima ação externa: ativar um plano Railway e repetir o deploy. Depois do endpoint responder com sucesso, registrar e testar o webhook com um evento controlado.

## Limites de escopo

- Nenhum arquivo do portal de membros foi alterado.
- Nenhum segredo ou dado pessoal foi registrado nesta evidência.
- As mudanças permanecem no branch isolado `codex/commercial-intelligence-f0-f1`.
