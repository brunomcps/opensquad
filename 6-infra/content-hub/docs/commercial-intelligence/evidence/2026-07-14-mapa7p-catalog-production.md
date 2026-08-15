# Evidência — rollout MAPA-7P para o catálogo não-Short

Data da execução: 2026-07-14 20:30:12 -03:00.

## Escopo autorizado

Criar as três campanhas rastreáveis do MAPA-7P para todos os vídeos do catálogo, exceto Shorts:

- `description` (`-d`);
- `pinned_comment` (`-c`);
- `comment_reply` (`-r`).

O rollout não altera descrições, comentários ou respostas no YouTube. Também não altera credenciais, webhook, landing page, portal de membros, DNS ou frontend publicado.

## Implementação de segurança

Foi adicionado o comando idempotente `npm run ci:catalog:mapa7p`:

- sem `--apply`, executa auditoria read-only;
- com `--apply`, cria somente combinações vídeo/posição ausentes;
- interrompe se existir vídeo com `content_type=unknown`;
- exclui `content_type=short`;
- valida unicidade, status, slug, tracking code, destino e UTMs;
- usa `HEAD` para validar redirects sem registrar clique;
- compara as campanhas associadas a Shorts antes e depois do lote.

A credencial administrativa existente foi obtida pela sessão já autenticada da Supabase CLI e mantida somente no processo da execução. Nenhuma credencial foi criada, exibida, gravada ou alterada.

## Dry-run anterior

Resultado:

```json
{
  "catalogTotal": 63,
  "longVideos": 49,
  "liveVideos": 1,
  "shortsExcluded": 13,
  "eligibleNonShortVideos": 50,
  "existingTargetCampaigns": 3,
  "missingTargetCampaigns": 147,
  "expectedFinalTargetCampaigns": 150,
  "existingShortCampaigns": 0
}
```

Não havia vídeos com tipo desconhecido nem chaves duplicadas.

## Testes locais anteriores ao lote

- `npm run typecheck`: aprovado;
- `npm test`: 83 testes, 83 aprovados, 0 falhas;
- `git diff --check`: aprovado.

## Aplicação em produção

Comando: `npm run ci:catalog:mapa7p -- --apply`.

Resultado:

```json
{
  "ok": true,
  "created": 147,
  "skipped": 3,
  "finalTargetCampaigns": 150,
  "shortCampaignsBefore": 0,
  "shortCampaignsAfter": 0,
  "redirectsValidated": 150,
  "clickEventsBefore": 0,
  "clickEventsAfter": 0
}
```

Os três itens ignorados são as campanhas já existentes do piloto `0OkxYzoxzUk`. A inserção criou somente as 147 combinações ausentes.

## Validação pós-lote

Uma segunda execução em modo read-only retornou:

```json
{
  "catalogTotal": 63,
  "longVideos": 49,
  "liveVideos": 1,
  "shortsExcluded": 13,
  "eligibleNonShortVideos": 50,
  "existingTargetCampaigns": 150,
  "missingTargetCampaigns": 0,
  "expectedFinalTargetCampaigns": 150,
  "existingShortCampaigns": 0
}
```

Todos os 150 links responderam HTTP 302 para o HotLink do MAPA-7P com `src`, `utm_source`, `utm_medium`, `utm_campaign` e `utm_content` esperados. A validação `HEAD` não criou eventos de clique.

Amostras validadas:

| Vídeo | Tipo | Descrição | Comentário fixado | Resposta |
| --- | --- | --- | --- | --- |
| `0OkxYzoxzUk` | long | `https://link.brunosallesphd.com.br/m7p/0okxyzoxzuk-d` | `https://link.brunosallesphd.com.br/m7p/0okxyzoxzuk-c` | `https://link.brunosallesphd.com.br/m7p/0okxyzoxzuk-r` |
| `bcapHWPIx7M` | long | `https://link.brunosallesphd.com.br/m7p/bcaphwpix7m-d` | `https://link.brunosallesphd.com.br/m7p/bcaphwpix7m-c` | `https://link.brunosallesphd.com.br/m7p/bcaphwpix7m-r` |
| `loIJ894Q0wE` | live | `https://link.brunosallesphd.com.br/m7p/loij894q0we-d` | `https://link.brunosallesphd.com.br/m7p/loij894q0we-c` | `https://link.brunosallesphd.com.br/m7p/loij894q0we-r` |

## Estado final

- 50 vídeos não-Short cobertos;
- 3 posições por vídeo;
- 150 campanhas ativas;
- 13 Shorts excluídos;
- 0 campanha associada a Short;
- 0 combinação ausente;
- 0 clique técnico residual.
