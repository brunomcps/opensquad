# Plano de implementação: publicação de referências pelo Hermes

**Data:** 2026-07-24
**Especificação:** `docs/superpowers/specs/2026-07-24-hermes-story-reference-publisher-design.md`
**Branch:** `codex/commercial-intelligence-story-recovery`

## Objetivo

Permitir que o Hermes transforme uma sequência analisada em template e referência oficiais da plataforma, com assets duráveis, persistência idempotente, leitura de retorno e link direto.

Toda referência criada pelo Hermes precisa ter:

- modo rápido;
- raio-X visual;
- análise detalhada;
- análise transversal;
- molde 9:16;
- preservar, adaptar e evitar.

Não haverá fila de rascunhos.

## Estratégia de execução

Implementar em oito blocos independentes:

1. contrato estrito de ingestão;
2. dossiê genérico na interface;
3. persistência idempotente e histórico;
4. autenticação restrita do agente;
5. Edge Function e assets;
6. deep link;
7. skill e cliente Python do Hermes;
8. validação local e gate de produção.

Cada bloco começa por um teste que falha, recebe a menor implementação necessária e termina com testes focados. Commits permanecem pequenos.

## Premissas confirmadas

- O contrato atual já contém `quick`, `visual` e `deep`.
- A RPC atual cria referências atomicamente, mas não atualiza de modo idempotente.
- `ci-content` exige JWT de administrador e não deve ser usado pelo Hermes.
- O dossiê visual atual está indevidamente restrito à URL do Raul e a três stories.
- O formulário manual atual não envia a análise rica.
- A skill analítica canônica está em `/home/bruno/.hermes/skills/social-media/story-sequence-template-analysis`.
- A nova skill será versionada no repositório e instalada no WSL.

---

## Tarefa 1: contrato estrito do payload do Hermes

### Arquivos

- Modificar: `6-infra/content-hub/supabase/functions/_shared/storyContent.ts`
- Criar: `6-infra/content-hub/server/services/commercial-intelligence/storyReferenceAgentContract.test.ts`
- Criar: `6-infra/content-hub/server/services/commercial-intelligence/storyReferenceAgentFixtures.ts`

### Passo 1.1: escrever fixtures canônicas

Criar uma fixture genérica com quatro stories, sem conteúdo ou identidade do Raul.

Ela deve conter:

- `referenceKey`;
- `contentHash`;
- template completo;
- análise transversal;
- quatro itens ordenados;
- `quick`, `visual` e `deep` em todos os itens;
- hashes, MIME e nomes dos assets.

Criar mutadores pequenos para remover uma camada, duplicar ordem, quebrar hash e esvaziar seções.

### Passo 1.2: escrever testes que falham

Cobrir:

- payload completo aceito;
- ausência de `quick` rejeitada;
- ausência de `visual` rejeitada;
- ausência de `deep` rejeitada;
- títulos rápido, visual e detalhado precisam ser distintos;
- ordem começa em 1 e não tem buracos;
- quantidade de itens entre 1 e 20;
- `referenceKey` e `contentHash` seguem formato;
- template tem slug, etapas e molde;
- cada asset tem SHA-256, MIME permitido e tamanho positivo;
- payload e assets respeitam limites explícitos de tamanho;
- análise transversal tem resumo, overview, mapa, gramática, síntese, produto, template registrado e regras de transferência.

Executar:

```powershell
npm test -- --test-name-pattern="agent reference contract"
```

Resultado esperado: falha porque o parser estrito ainda não existe.

### Passo 1.3: implementar tipos e parser

Adicionar:

- `StoryAgentAssetInput`;
- `StoryAgentTemplateInput`;
- `StoryAgentReferenceInput`;
- `parseAgentReferenceInput`;
- validações reutilizáveis para dossier completo.

Fixar no contrato do endpoint:

```text
MAX_AGENT_BODY_BYTES = 1 MiB
MAX_ASSET_BYTES = 20 MiB
MAX_TOTAL_ASSET_BYTES = 200 MiB
```

Não tornar `quick`, `visual` e `deep` obrigatórios no formulário manual. A rigidez vale para o endpoint do Hermes.

### Passo 1.4: rodar testes

```powershell
npm test -- --test-name-pattern="agent reference contract"
npm run typecheck
```

### Passo 1.5: commit

```powershell
git add 6-infra/content-hub/supabase/functions/_shared/storyContent.ts `
  6-infra/content-hub/server/services/commercial-intelligence/storyReferenceAgentContract.test.ts `
  6-infra/content-hub/server/services/commercial-intelligence/storyReferenceAgentFixtures.ts
git commit -m "feat(ci): define strict Hermes story reference contract"
```

---

## Tarefa 2: tornar o dossiê completo genérico

### Arquivos

- Modificar: `6-infra/content-hub/src/components/commercial-intelligence/story-dossier/visualDossierModel.ts`
- Modificar: `6-infra/content-hub/src/components/commercial-intelligence/story-dossier/VisualDossierQuickMode.tsx`
- Modificar: `6-infra/content-hub/src/components/commercial-intelligence/story-dossier/VisualDossierXray.tsx`
- Modificar: `6-infra/content-hub/src/components/commercial-intelligence/story-dossier/VisualDossierDeepAnalysis.tsx`
- Modificar: `6-infra/content-hub/src/components/commercial-intelligence/story-dossier/VisualReferenceDossier.tsx`
- Modificar: `6-infra/content-hub/src/components/commercial-intelligence/StoryContentView.tsx`
- Modificar: `6-infra/content-hub/server/services/commercial-intelligence/visualDossierModel.test.ts`
- Modificar: `6-infra/content-hub/server/services/commercial-intelligence/storyContentEdgeContract.test.ts`
- Modificar: `6-infra/content-hub/server/scripts/commercial-intelligence/visual-raul-dossier-smoke.ts`

### Passo 2.1: escrever regressões

Adicionar testes que provem:

- uma referência completa de qualquer creator é reconhecida;
- sequências de 1, 3, 4 e 8 stories funcionam;
- URL parecida não é usada como critério de completude;
- qualquer item incompleto fecha o dossiê inteiro;
- a ordem narrativa é contínua;
- headings e labels vêm dos dados;
- nenhuma cópia visível menciona Raul fora da fixture do Raul;
- o template `História → pequena entrega → CTA` continua visível e inalterado.

Resultado esperado: falha devido a `canonicalRaulSourceUrl`, `items.length !== 3`, `storyRailLabels` e títulos específicos.

### Passo 2.2: generalizar o view model

Remover:

- comparação com a URL canônica do Raul;
- exigência de exatamente três itens;
- labels fixos do trilho;
- título “Como esta sequência vende a persona do Raul”;
- texto “estética de Raul”.

Usar:

- `sourceAccount`;
- `quick.roleLabel`;
- `quick.title`;
- `analysis.registeredTemplate`;
- `analysis.productRevealed`;
- `analysis.sourceNote`;
- quantidade real de itens.

Manter o dossiê do Raul como teste de regressão, não como regra de produto.

### Passo 2.3: validar layout variável

O trilho deve:

- usar scroll horizontal quando necessário;
- preservar dimensões dos previews;
- não encolher textos ou botões;
- manter imagens com `object-fit: contain`.

Atualizar o smoke para testar três e quatro stories.

### Passo 2.4: executar

```powershell
npm test -- --test-name-pattern="dossi|biblioteca"
npm run typecheck
npm run ci:build:web
```

### Passo 2.5: commit

```powershell
git add 6-infra/content-hub/src/components/commercial-intelligence/story-dossier `
  6-infra/content-hub/src/components/commercial-intelligence/StoryContentView.tsx `
  6-infra/content-hub/server/services/commercial-intelligence/visualDossierModel.test.ts `
  6-infra/content-hub/server/services/commercial-intelligence/storyContentEdgeContract.test.ts `
  6-infra/content-hub/server/scripts/commercial-intelligence/visual-raul-dossier-smoke.ts
git commit -m "refactor(ci): generalize complete story dossiers"
```

---

## Tarefa 3: persistência idempotente e revisões

### Arquivos

- Criar: `6-infra/content-hub/supabase/migrations/20260725030000_ci_story_reference_agent_ingest.sql`
- Criar: `6-infra/content-hub/server/scripts/commercial-intelligence/story-reference-agent-migration.test.ts`
- Modificar: `6-infra/content-hub/server/scripts/commercial-intelligence/story-content-migration.test.ts`

### Passo 3.1: escrever testes de banco

Cobrir em PGlite:

- colunas `canonical_key` em `story_templates`;
- colunas `reference_key` e `content_hash` em `story_sequences`;
- índice único para template ativo por `canonical_key`;
- índice único para referência por `reference_key`;
- tabela `story_reference_revisions`;
- tabela `ci_agent_request_nonces`;
- RPC `story_upsert_agent_reference`;
- RPC `ci_claim_agent_nonce`;
- criação nova;
- template existente por chave exata;
- template inexistente criado uma vez;
- repetição idêntica retorna o mesmo `sequence_id` e revisão;
- conteúdo alterado atualiza a mesma referência e incrementa revisão;
- snapshot anterior preservado;
- itens antigos sem vínculos removidos;
- falha no item intermediário faz rollback;
- conflito de identidade falha;
- `anon` e `authenticated` não executam as RPCs;
- `service_role` executa.

Resultado esperado: falha porque migration e RPCs ainda não existem.

### Passo 3.2: implementar schema

Adicionar:

```text
story_templates.canonical_key
story_sequences.reference_key
story_sequences.content_hash
story_reference_revisions
ci_agent_request_nonces
```

Backfill:

- templates existentes recebem slug canônico determinístico;
- referências existentes recebem chave apenas quando a identidade for inequívoca;
- o template do Raul e `História → pequena entrega → CTA` permanecem distintos.

Não alterar status ou conteúdo editorial existente.

### Passo 3.3: implementar nonce

`ci_claim_agent_nonce`:

- recebe `key_id`, `nonce`, `requested_at`;
- rejeita timestamp fora de cinco minutos;
- insere com chave única;
- falha em replay;
- remove nonces expirados de forma limitada na própria chamada.

### Passo 3.4: implementar upsert

`story_upsert_agent_reference`:

- valida template por `canonical_key`;
- cria template quando ausente;
- não sobrescreve silenciosamente template existente;
- cria referência e itens na primeira chamada;
- retorna existente quando hash é igual;
- grava snapshot antes de correção;
- substitui análise, itens e vínculo em uma transação;
- incrementa `content_revision`;
- retorna `sequence_id`, `template_id`, `content_revision` e operação.

### Passo 3.5: executar

```powershell
npm test -- --test-name-pattern="agent migration|story content migration"
```

### Passo 3.6: commit

```powershell
git add 6-infra/content-hub/supabase/migrations/20260725030000_ci_story_reference_agent_ingest.sql `
  6-infra/content-hub/server/scripts/commercial-intelligence/story-reference-agent-migration.test.ts `
  6-infra/content-hub/server/scripts/commercial-intelligence/story-content-migration.test.ts
git commit -m "feat(ci): add idempotent story reference persistence"
```

---

## Tarefa 4: autenticação HMAC do Hermes

### Arquivos

- Criar: `6-infra/content-hub/supabase/functions/_shared/agentIngestAuth.ts`
- Criar: `6-infra/content-hub/server/services/commercial-intelligence/agentIngestAuth.test.ts`
- Modificar: `6-infra/content-hub/supabase/functions/_shared/http.ts`

### Passo 4.1: escrever testes

Cobrir:

- assinatura válida;
- corpo adulterado;
- método adulterado;
- caminho adulterado;
- timestamp expirado;
- timestamp futuro;
- nonce inválido;
- key ID desconhecido;
- comparação em tempo constante;
- nenhuma mensagem de erro inclui secret ou assinatura.

### Passo 4.2: definir protocolo

Headers:

```text
x-ci-agent-key
x-ci-agent-timestamp
x-ci-agent-nonce
x-ci-agent-signature
```

Base assinada:

```text
METHOD
PATH
TIMESTAMP
NONCE
SHA256(BODY)
```

Secrets remotos:

```text
CI_STORY_INGEST_KEYS={"hermes-local":"<secret>"}
```

O código:

- lê o corpo uma única vez como bytes;
- calcula SHA-256;
- resolve a key pelo ID;
- valida HMAC-SHA256;
- só depois chama `ci_claim_agent_nonce`.

### Passo 4.3: executar

```powershell
npm test -- --test-name-pattern="agent ingest auth"
npm run typecheck
```

### Passo 4.4: commit

```powershell
git add 6-infra/content-hub/supabase/functions/_shared/agentIngestAuth.ts `
  6-infra/content-hub/supabase/functions/_shared/http.ts `
  6-infra/content-hub/server/services/commercial-intelligence/agentIngestAuth.test.ts
git commit -m "feat(ci): authenticate Hermes story ingestion"
```

---

## Tarefa 5: Edge Function, storage e leitura canônica

### Arquivos

- Criar: `6-infra/content-hub/supabase/functions/ci-story-ingest/index.ts`
- Criar: `6-infra/content-hub/supabase/functions/_shared/storyContentRepository.ts`
- Modificar: `6-infra/content-hub/supabase/functions/ci-content/index.ts`
- Modificar: `6-infra/content-hub/supabase/config.toml`
- Modificar: `6-infra/content-hub/package.json`
- Criar: `6-infra/content-hub/server/services/commercial-intelligence/storyAgentIngestEdge.test.ts`
- Modificar: `6-infra/content-hub/server/services/commercial-intelligence/storyContentEdgeContract.test.ts`

### Passo 5.1: extrair leitura compartilhada

Mover para `storyContentRepository.ts`:

- `TEMPLATE_FIELDS`;
- `SEQUENCE_FIELDS`;
- `templateDto`;
- `sequenceDto`;
- `loadSequence`.

Atualizar `ci-content` sem mudar sua resposta pública.

Rodar os testes existentes antes de criar a nova função.

### Passo 5.2: escrever testes da função

Cobrir:

- apenas POST;
- ação desconhecida;
- autenticação antes da mutação;
- `prepare_assets`;
- `publish_reference`;
- bucket e caminho fixos;
- recusa de MIME fora da allowlist;
- recusa de caminho divergente;
- asset ausente;
- asset cujo conteúdo remoto não corresponde ao SHA-256 declarado;
- parser estrito antes da RPC;
- leitura de retorno após a RPC;
- URL e operação no resultado;
- nenhum JWT administrativo ou `service_role` devolvido.

### Passo 5.3: preparar assets

`prepare_assets`:

- valida apenas identidade e manifesto de assets;
- usa bucket público `story-reference-assets`;
- produz caminho `story-references/<reference-key>/<ordem>-<hash>.<ext>`;
- cria URL assinada de upload;
- devolve URL pública final e expiração da assinatura.

Uploads repetidos usam o mesmo caminho.

### Passo 5.4: publicar

`publish_reference`:

- valida HMAC e nonce;
- executa `parseAgentReferenceInput`;
- confirma todos os objetos no storage;
- baixa cada objeto confirmado e recalcula o SHA-256;
- confirma hash, tamanho, MIME e caminho antes de abrir a transação editorial;
- substitui URLs locais pelas URLs públicas confirmadas;
- chama `story_upsert_agent_reference`;
- chama `loadSequence`;
- compara ID, template, revisão, ordem e URLs;
- monta deep link:

```text
<CI_APP_PUBLIC_URL>/?tab=content-templates&template=<template-id>&reference=<sequence-id>
```

### Passo 5.5: configurar checks

Adicionar `ci-story-ingest/index.ts` a `ci:check:edge`.

Registrar a função em `supabase/config.toml` sem desativar validações globais de forma ampla.

### Passo 5.6: executar

```powershell
npm test -- --test-name-pattern="story agent ingest|ci-content"
npm run ci:check:edge
npm run typecheck
```

### Passo 5.7: commit

```powershell
git add 6-infra/content-hub/supabase/functions/ci-story-ingest `
  6-infra/content-hub/supabase/functions/_shared/storyContentRepository.ts `
  6-infra/content-hub/supabase/functions/ci-content/index.ts `
  6-infra/content-hub/supabase/config.toml `
  6-infra/content-hub/package.json `
  6-infra/content-hub/server/services/commercial-intelligence
git commit -m "feat(ci): expose restricted Hermes story ingestion"
```

---

## Tarefa 6: deep link para o dossiê certo

### Arquivos

- Modificar: `6-infra/content-hub/ci-app/src/StandaloneCommercialIntelligenceView.tsx`
- Modificar: `6-infra/content-hub/src/components/commercial-intelligence/StoryContentView.tsx`
- Modificar: `6-infra/content-hub/src/components/commercial-intelligence/story-dossier/VisualReferenceDossier.tsx`
- Criar: `6-infra/content-hub/server/services/commercial-intelligence/storyReferenceDeepLink.test.ts`
- Modificar: `6-infra/content-hub/server/services/commercial-intelligence/storyContentEdgeContract.test.ts`

### Passo 6.1: escrever testes

Cobrir:

- `?tab=content-templates` seleciona a biblioteca;
- `template` seleciona o template exato;
- `reference` seleciona a referência exata dentro do template;
- parâmetros inválidos caem no comportamento normal;
- reload mantém a seleção;
- mudança manual atualiza a URL sem reload;
- múltiplas referências completas não escolhem silenciosamente a primeira quando existe ID explícito.

### Passo 6.2: implementar seleção

Adicionar props:

```text
initialTemplateId
initialReferenceId
onSelectionChange
```

O componente:

- resolve a referência pelo ID;
- valida o vínculo com o template;
- mantém um seletor quando houver várias referências;
- escreve os parâmetros com `history.replaceState`;
- preserva os parâmetros após autenticação e reload.

### Passo 6.3: executar

```powershell
npm test -- --test-name-pattern="deep link|TemplatesSection"
npm run typecheck
npm run ci:build:web
```

### Passo 6.4: commit

```powershell
git add 6-infra/content-hub/ci-app/src/StandaloneCommercialIntelligenceView.tsx `
  6-infra/content-hub/src/components/commercial-intelligence/StoryContentView.tsx `
  6-infra/content-hub/src/components/commercial-intelligence/story-dossier/VisualReferenceDossier.tsx `
  6-infra/content-hub/server/services/commercial-intelligence/storyReferenceDeepLink.test.ts `
  6-infra/content-hub/server/services/commercial-intelligence/storyContentEdgeContract.test.ts
git commit -m "feat(ci): deep link story reference dossiers"
```

---

## Tarefa 7: criar e instalar a skill do Hermes

### Arquivos versionados

- Criar: `6-infra/content-hub/hermes-skills/catalog-story-reference/SKILL.md`
- Criar: `6-infra/content-hub/hermes-skills/catalog-story-reference/scripts/publish_story_reference.py`
- Criar: `6-infra/content-hub/hermes-skills/catalog-story-reference/scripts/test_publish_story_reference.py`
- Criar: `6-infra/content-hub/hermes-skills/catalog-story-reference/references/payload-contract.md`
- Criar: `6-infra/content-hub/hermes-skills/catalog-story-reference/templates/reference-payload.json`

### Instalação local

- Criar após validação: `/home/bruno/.hermes/skills/social-media/catalog-story-reference/`
- Criar em runtime: `/home/bruno/.hermes/state/story-reference-publications/`

### Passo 7.1: escrever testes do cliente

Usar `unittest` e servidor HTTP local.

Cobrir:

- `validate` detecta camada ausente;
- hash de asset determinístico;
- `referenceKey` determinística;
- HMAC igual ao vetor de teste do servidor;
- upload usa a URL exata recebida;
- repetição com `referenceKey` e `contentHash` iguais reaproveita receipt;
- correção com o mesmo `referenceKey` e novo `contentHash` publica nova revisão;
- publish só roda após todos os uploads;
- read-back divergente falha;
- receipt só é gravado após sucesso;
- secret nunca aparece em stdout, stderr ou receipt;
- falha de rede usa backoff apenas em operações idempotentes.

Executar:

```powershell
wsl.exe -d Ubuntu -- bash -lc "python3 '/mnt/c/tmp/os-ci-story-recovery/6-infra/content-hub/hermes-skills/catalog-story-reference/scripts/test_publish_story_reference.py'"
```

Resultado esperado: falha até o cliente existir.

### Passo 7.2: escrever a skill

O `SKILL.md` deve:

- disparar quando Bruno pedir análise mais catalogação;
- exigir intenção explícita de publicar;
- mandar a skill analítica produzir o dossiê;
- usar o template JSON;
- rodar primeiro `validate`;
- executar `publish`;
- conferir o retorno;
- responder com título, template, quantidade, revisão, operação e link;
- nunca chamar sucesso antes do read-back;
- nunca solicitar ou imprimir `service_role`.

Manter o corpo curto. Contrato detalhado fica em `references/payload-contract.md`.

### Passo 7.3: implementar o cliente

Subcomandos:

```text
validate <payload.json>
publish <payload.json>
```

Variáveis privadas:

```text
HERMES_STORY_INGEST_URL
HERMES_STORY_INGEST_KEY_ID
HERMES_STORY_INGEST_SECRET
```

Usar biblioteca padrão do Python.

O receipt conterá apenas:

- `referenceKey`;
- `referenceId`;
- `templateId`;
- `contentHash`;
- `revision`;
- `link`;
- timestamp.

`publish` inclui a leitura canônica de retorno no mesmo fluxo. Não existe comando
separado de verificação nem terceira ação no endpoint.

### Passo 7.4: validar skill

Executar:

```powershell
python "C:\Users\bruno\.codex\skills\.system\skill-creator\scripts\quick_validate.py" `
  "6-infra\content-hub\hermes-skills\catalog-story-reference"
wsl.exe -d Ubuntu -- bash -lc "python3 '/mnt/c/tmp/os-ci-story-recovery/6-infra/content-hub/hermes-skills/catalog-story-reference/scripts/test_publish_story_reference.py'"
```

### Passo 7.5: commit da fonte

```powershell
git add 6-infra/content-hub/hermes-skills/catalog-story-reference
git commit -m "feat(hermes): add story reference catalog skill"
```

### Passo 7.6: instalar sem configurar produção

Criar backup se o destino já existir e copiar a árvore validada para:

```text
/home/bruno/.hermes/skills/social-media/catalog-story-reference
```

Não configurar secret nem fazer chamada remota nesta etapa.

---

## Tarefa 8: integração local e regressão completa

### Arquivos

- Criar: `6-infra/content-hub/server/services/commercial-intelligence/storyReferenceAgentE2E.test.ts`
- Modificar: `6-infra/content-hub/server/scripts/commercial-intelligence/visual-story-content-smoke.ts`
- Modificar: `6-infra/content-hub/server/scripts/commercial-intelligence/visual-raul-dossier-smoke.ts`
- Criar: `6-infra/content-hub/docs/commercial-intelligence/evidence/hermes-story-reference-local/README.md`

O README desta tarefa é evidência técnica de execução, não documentação da skill.

### Passo 8.1: integração fechada

Montar harness local com:

- banco PGlite;
- adapter de storage temporário;
- Edge Function exercida com assinatura real;
- cliente Python apontado para servidor local;
- fixture genérica de quatro stories.

Provar:

1. primeira chamada cria;
2. segunda chamada idêntica não duplica;
3. correção atualiza a mesma referência;
4. revisão sobe de 1 para 2;
5. link contém template e referência corretos;
6. assets retornados são os mesmos do manifesto;
7. quick, visual e deep chegam intactos.

### Passo 8.2: smoke visual

Executar build e servidor:

```powershell
npm run ci:build:web
npm run ci:preview:web -- --host 127.0.0.1 --port 4182
```

Rodar:

```powershell
npm run ci:smoke:stories
npm run ci:smoke:raul-dossier
```

Adicionar capturas desktop e mobile da fixture genérica e do Raul.

Validar:

- modo rápido;
- raio-X;
- análise detalhada em largura total;
- trilho com quatro stories;
- imagens sem corte;
- nenhum overflow;
- template `História → pequena entrega → CTA` preservado.

### Passo 8.3: regressão

```powershell
npm test
npm run typecheck
npm run ci:build:web
npm run ci:verify-bundle
npm run ci:check:edge
```

Registrar cada comando como `pass`, `warn`, `fail` ou `unverified`.

### Passo 8.4: commit

```powershell
git add 6-infra/content-hub/server/services/commercial-intelligence/storyReferenceAgentE2E.test.ts `
  6-infra/content-hub/server/scripts/commercial-intelligence/visual-story-content-smoke.ts `
  6-infra/content-hub/server/scripts/commercial-intelligence/visual-raul-dossier-smoke.ts `
  6-infra/content-hub/docs/commercial-intelligence/evidence/hermes-story-reference-local
git commit -m "test(ci): verify Hermes story ingestion end to end"
```

---

## Gate de produção

Parar após a Tarefa 8 e apresentar:

- migrations previstas;
- função nova;
- nomes dos secrets, sem valores;
- resultados dos testes;
- screenshots;
- diff dos arquivos;
- riscos residuais.

Solicitar autorização específica antes de:

- aplicar migration remota;
- criar bucket remoto;
- configurar `CI_STORY_INGEST_KEYS`;
- publicar `ci-story-ingest`;
- publicar frontend;
- configurar o secret local do Hermes;
- enviar uma sequência real.

## Após autorização de produção

Executar nesta ordem:

1. aplicar migration;
2. confirmar privilégios;
3. criar ou confirmar bucket;
4. configurar secrets remotos;
5. publicar Edge Function;
6. executar requisição inválida e confirmar rejeição;
7. publicar frontend;
8. smoke autenticado;
9. configurar secret no Hermes sem imprimir valor;
10. reiniciar o gateway apenas se a descoberta de skills exigir;
11. publicar uma fixture controlada;
12. ler de volta banco, template, itens e assets;
13. abrir o deep link;
14. testar no Telegram somente com autorização da mensagem externa.

## Definição de pronto

O trabalho só está pronto quando:

- uma sequência não-Raul produz dossiê completo;
- rápida, visual e detalhada aparecem sempre;
- assets são duráveis;
- template é resolvido por chave exata;
- repetição não duplica;
- correção preserva o ID;
- revision history existe;
- HMAC, timestamp e nonce são validados;
- o Hermes não possui credencial administrativa ampla;
- o link abre a referência correta;
- o Hermes confirma sucesso apenas após read-back;
- o template `História → pequena entrega → CTA` continua intacto;
- todos os testes obrigatórios foram classificados.
