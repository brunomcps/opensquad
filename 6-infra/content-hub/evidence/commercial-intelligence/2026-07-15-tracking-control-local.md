# Controle de rastreamento — evidência local (2026-07-15)

## Escopo validado

- Histórico de cliques e compras do MAPA-7P por período, vídeo e posição D/C/R.
- Separação de cliques qualificados, técnicos e ainda não classificados.
- Separação de compra principal, produto adicional, origem ausente e origem conflitante.
- Livro-caixa com horário exato em America/Sao_Paulo e sem dados pessoais do comprador.
- Carimbos de consulta, clique bruto, clique qualificado, webhook Hotmart, reconciliação e próxima reconciliação.
- Consulta automática do painel a cada 30 segundos somente enquanto a aba está visível.
- Falha inicial de API exibida como indisponibilidade, sem fabricar zeros, gráficos vazios ou “ainda não registrado”.
- Troca de filtro, polling e paginação protegidos contra mistura de respostas antigas.
- Leitura da agenda `ci-hotmart-daily` diretamente de `cron.job`; a interface não anuncia agenda automática quando ela não existe ou está inativa.
- Reparo idempotente da reconciliação Hotmart sem regressão de reembolso, chargeback, status conhecido ou código de campanha registrado.
- Reconciliação separada em última tentativa, último sucesso completo, última parcial e falha; parcial/falha não avança o carimbo de sucesso.
- Entrada de clique autenticada Worker → Edge por HMAC, com nonce anti-replay e deduplicação transacional.

## Evidência automatizada

| Verificação | Resultado |
| --- | --- |
| `npm test` | 131 testes aprovados, 0 falhas |
| PostgreSQL local via PGlite | RPCs de série, eventos, paginação, finanças, agenda, reparo Hotmart, nonce/replay e deduplicação executados com SQL real |
| `npm run typecheck` | aprovado |
| `npm run ci:check:edge` | 11 Edge Functions aprovadas pelo Deno |
| `npm run ci:migrate` | modo `check` aprovado; 6 migrations presentes e nenhuma aplicada remotamente |
| `npm run ci:build:web` | build aprovado; 735 módulos transformados |
| `npm run ci:verify-bundle` | 3 arquivos, 883.507 bytes, 7 verificações de segredo aprovadas |
| `npm run ci:smoke:decisions` | Chrome real; desktop e mobile aprovados |
| `git diff --check` | aprovado antes do fechamento |

O teste PostgreSQL local cobre explicitamente:

- venda aprovada contada e reembolso preservado no livro-caixa, sem entrar como compra aprovada no gráfico;
- produto adicional separado da venda principal do MAPA;
- origem conflitante marcada como ambígua, sem crédito duplo;
- valor líquido oficial e fallback `bruto - taxa`, com dado incompleto sinalizado;
- cursor UTF-8 e paginação sem repetição;
- campanhas fora do MAPA/D-C-R excluídas;
- agenda ausente retornando `hotmart_schedule_active=false`;
- `ci-hotmart-daily` ativa em `40 9 * * *` retornando agenda e expressão exatas.
- reconciliação sem nenhum grupo Hotmart lido marcada como `failed`, sem alterar o último sucesso completo;
- assinatura de ingestão, nonce usado uma única vez, primeiro clique qualificado e repetição classificada como duplicada;
- origem conflitante entre campanha MAPA e campanha externa marcada como ambígua;
- identificador Hotmart opaco no DTO e no cursor, sem expor o ID bruto da transação.

## Evidência visual

O smoke operou filtros, atualização manual do painel, cópia do link, vídeo expansível, detalhes administrativos, gráficos e livro-caixa.

- Desktop: 1.366 × 768, overflow horizontal 0 px.
- Mobile: 390 × 844, overflow horizontal 0 px.
- 4 abas visíveis, 4 etapas do fluxo, 5 KPIs, 8 campos de atualidade e 3 linhas de eventos validadas.
- Estado controlado de falha 503 validado: nenhum KPI, gráfico, livro-caixa ou zero falso foi renderizado.
- Link copiado: `https://link.brunosallesphd.com.br/m7p/0okxyzoxzuk-d`.
- Embed validado: `https://www.youtube-nocookie.com/embed/0OkxYzoxzUk?autoplay=1`.

Capturas locais:

- `docs/commercial-intelligence/evidence/tracking-control/desktop-1366-tracking-control.png`
- `docs/commercial-intelligence/evidence/tracking-control/desktop-1366-tracking-charts.png`
- `docs/commercial-intelligence/evidence/tracking-control/desktop-1366-tracking-ledger.png`
- `docs/commercial-intelligence/evidence/tracking-control/mobile-390-tracking-control.png`
- `docs/commercial-intelligence/evidence/tracking-control/mobile-390-tracking-charts.png`
- `docs/commercial-intelligence/evidence/tracking-control/mobile-390-tracking-ledger.png`

## Limites desta rodada

- Nenhuma migration foi aplicada no Supabase de produção.
- Nenhuma Edge Function, Cloudflare Worker ou interface foi publicada.
- Nenhuma credencial, secret, webhook, agenda remota ou descrição/comentário do YouTube foi alterado.
- Os novos segredos `CLICK_INGEST_SECRET` e `CLICK_FINGERPRINT_SECRET` existem apenas como contrato de código; ainda não foram criados em produção.
- Cliques históricos anteriores à classificação permanecem honestamente como `não classificados`; não são convertidos artificialmente em pessoas reais.
- A confirmação ponta a ponta com dados reais depende do gate de produção: deploy, reconciliação Hotmart, acesso com user-agent de scanner/automação excluído das métricas e conferência de uma venda conhecida. O parâmetro público `ci_test` foi removido para impedir subcontagem maliciosa.
