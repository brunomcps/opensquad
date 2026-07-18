# Controle de rastreamento — evidência de produção (2026-07-15)

## Escopo publicado

- Histórico global e por vídeo/local D-C-R, com filtros de período, tráfego e granularidade.
- Gráficos separados de cliques e compras, mais livro-caixa com horário exato em Brasília.
- Separação explícita entre clique qualificado, bot/scanner/técnico e legado sem classificação.
- Compra principal, produto adicional, origem ausente e origem conflitante mostrados separadamente.
- Oito carimbos de atualidade, atualização manual e polling de 30 segundos com a aba visível.
- Reconciliação Hotmart com tentativa, sucesso completo, parcial, falha e próxima execução distintos.
- Ingestão Worker → Edge assinada por HMAC, nonce anti-replay e fingerprint diário irreversível.
- Nenhum IP ou user-agent bruto é enviado ao Supabase ou persistido no banco.

O portal de membros não foi alterado. Descrições, comentários e respostas do YouTube não foram alterados nesta publicação.

## Banco e migrations

Projeto: `content-hub` (`vdaualgktroizsttbrfh`), estado `ACTIVE_HEALTHY`.

Aplicadas isoladamente e dentro de transação:

- `20260715120000_ci_tracking_history.sql`;
- `20260715130000_ci_hotmart_reconciliation_repair.sql`.

Verificação posterior:

- `ci_click_ingest_nonces` presente;
- `ci_operational_events` presente;
- `ci_tracking_freshness()` presente;
- `ci_tracking_series(...)` presente;
- `ci_tracking_events(...)` presente;
- as duas versões aparecem alinhadas nas colunas local e remota do histórico de migrations;
- 0 falha operacional não resolvida ao final.

Os 617 cliques existentes no momento da migration não foram convertidos artificialmente em pessoas. O backfill classificou 60 registros com flag antiga de bot como `bot` e manteve 557 como `unknown`.

## Secrets e publicação

Secrets novos, verificados apenas pelo nome:

- Supabase: `CLICK_INGEST_SECRET`;
- Cloudflare Worker: `CLICK_INGEST_SECRET` e `CLICK_FINGERPRINT_SECRET`.

Os valores foram gerados aleatoriamente, usados por arquivos temporários removidos no mesmo processo e não foram impressos nem gravados no repositório. Nenhum secret já existente foi substituído.

Artefatos publicados:

- Worker `mapa7p-link-router`, versão ativa `9818c14c-7a74-4616-948a-bff66ac6a37b`;
- `ci-tracking-series`, `ACTIVE`, versão 2;
- `ci-tracking-events`, `ACTIVE`, versão 2;
- `ci-sync-hotmart`, `ACTIVE`, versão 5;
- `ci-hotmart-webhook`, `ACTIVE`, versão 5;
- `ci-attribution`, `ACTIVE`, versão 5;
- `ci-campaign-redirect`, `ACTIVE`, versão 7;
- Cloudflare Pages, deployment `f407b82a-fb05-462d-8165-b30fda722577`;
- URL estável: `https://opensquad-commercial-intelligence.pages.dev`;
- asset servido: `assets/index-DHYZE0ku.js`.

O cadastro do webhook na Hotmart, a agenda do YouTube e as credenciais preexistentes foram preservados.

## Automação e reconciliação Hotmart

O job já existente foi mantido, sem remoção ou duplicação:

```text
ci-hotmart-daily: 40 9 * * *, active=true
```

Isso corresponde a 06:40 BRT enquanto Brasília estiver em UTC-3.

Reconciliação pós-publicação:

```json
{
  "status": "success",
  "rowsRead": 578,
  "rowsWritten": 7,
  "rowsSkipped": 571,
  "repairs": 35,
  "warnings": []
}
```

Início: 2026-07-15 12:52:35 BRT. Término: 2026-07-15 12:52:53 BRT.

## Prova controlada do clique

Foi feito um único `GET` com user-agent reconhecido como scanner, sem seguir o destino final.

Resultado:

```text
redirect: 302
video_id: 0OkxYzoxzUk
posição: description
traffic_classification: scanner
exclusion_reason: preview_or_security_scanner
```

Contagem no link antes/depois:

```text
scanner: 0 → 1
qualified: 0 → 0
```

O evento técnico foi preservado como evidência e não aumentou a métrica de pessoas qualificadas. Requisições `HEAD` posteriores mantiveram a contagem total em 618.

## Vendas e atribuição observadas

Depois da reconciliação:

- 2 compras principais do MAPA aprovadas desde o rollout do catálogo;
- 1 delas associada diretamente a um dos códigos criados;
- 1 sem código de origem correspondente;
- 0 reembolso ou chargeback posterior nessas duas compras;
- no recorte iniciado em 2026-07-14 00:00 BRT, a série também encontrou 3 produtos adicionais ligados aos links;
- todos os valores financeiros retornados nesse recorte estavam completos.

O sistema não atribui a compra sem código por suposição.

## Controles HTTP finais

```text
Pages: 200
link conhecido via HEAD: 302
slug inexistente via HEAD: 404
raiz do Worker: 404
POST no link: 405
Edge sem assinatura: 401
ci-tracking-series sem sessão: 401
ci-tracking-events sem sessão: 401
ci-sync-hotmart sem sessão: 401
```

## Smoke autenticado da tela real

Comando: `npm run ci:smoke:tracking:production`.

Resultado:

```json
{
  "ok": true,
  "appStatus": "authenticated",
  "eventRowsInspected": 50,
  "opaqueSaleEventIds": true,
  "desktopOverflowPx": 0,
  "mobileOverflowPx": 0,
  "dataFlowSteps": 4,
  "kpis": 5,
  "freshnessFields": 8,
  "chartPanels": 2,
  "hasEventLedger": true,
  "has0640ScheduleText": true,
  "manualRefreshConsultedAtChanged": true,
  "pollingObserved": true,
  "pollingElapsedMs": 27510,
  "commercialDataMutated": false,
  "temporarySessionDiscardedLocally": true
}
```

As respostas autenticadas foram inspecionadas sem encontrar e-mail, comprador, CPF, telefone, IP, user-agent bruto, fingerprint, nonce ou ID bruto de transação. IDs de venda usam o formato opaco `sale:<md5>`.

Capturas limitadas ao painel de rastreamento, sem o cabeçalho com e-mail:

- `evidence/commercial-intelligence/production-tracking-control/2026-07-15T16-00-47-734Z-1366x768-tracking.png`;
- `evidence/commercial-intelligence/production-tracking-control/2026-07-15T16-00-47-734Z-390x844-tracking.png`.

## Verificações automatizadas

| Verificação | Resultado |
| --- | --- |
| `npm test` | 131 aprovados, 0 falhas |
| `npm run typecheck` | aprovado |
| `npm run ci:check:edge` | 11 Edge Functions aprovadas |
| `npm run ci:build:web` | 735 módulos transformados |
| `npm run ci:verify-bundle` | 3 arquivos, 887.943 bytes, 7 verificações de segredo |
| `git diff --check` | aprovado |

Nenhuma API paga foi chamada.

## Incidente detectado e corrigido durante o rollout

O primeiro smoke pós-troca retornou `502` nos links públicos. A investigação confirmou divergência de bytes no secret enviado inicialmente à Cloudflare pelo pipe do PowerShell. O endpoint assinado rejeitava a assinatura e o Worker convertia a resposta interna em `502`.

Correção:

- rotação conjunta do secret nos dois lados por arquivos JSON/ENV temporários com UTF-8 exato;
- teste direto assinado retornando `302`;
- teste pelo domínio público retornando `302`;
- repetição dos controles HTTP e do smoke autenticado.

A janela observada foi de aproximadamente quatro minutos e terminou às 12:52 BRT. O estado final foi verificado com link conhecido em `302` e 0 falha operacional não resolvida.
