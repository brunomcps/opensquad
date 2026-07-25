---
name: catalog-story-reference
description: Use when Bruno explicitly asks Hermes to catalog or publish a completed Instagram story-sequence analysis in the OpenSquad Biblioteca de stories, preserving both the quick and detailed dossier, visual X-ray, visual grammar, 9:16 mold, and preserve/adapt/avoid rules.
---

# Catalogar Referência de Stories

Use esta skill somente quando Bruno pedir explicitamente para catalogar, colocar ou publicar a referência. Se o pedido original já incluir essa ação, não criar uma segunda aprovação editorial. Análise ou preview sem pedido de catalogação não autoriza publicação.

## Workflow

1. Leia `../_shared/canonical-story-dossier-contract.md` e trate `../_shared/canonical-story-dossier.schema.json` como autoridade estrutural.
2. Use `story-sequence-template-analysis` para produzir o dossiê `dossierContractVersion: "1.0"`. Nunca substitua a análise detalhada pela rápida.
   When the source is a course, PDF, or long document, keep the actual story
   sequence in `reference.items` and place the broader technique catalog in
   `reference.analysis.sourceLibrary`.
3. Copie `templates/reference-payload.json` para um arquivo de trabalho fora da skill e preencha todos os campos.
4. Leia `references/payload-contract.md` ao preparar ou reparar o payload.
5. Valide localmente antes de qualquer operação de rede:

```bash
python3 scripts/publish_story_reference.py validate /absolute/path/reference.json
```

6. Confira no relatório: versão `1.0`, zero erros, cobertura completa por story, quatro sínteses e todos os movimentos ligados ao molde.
7. Publique somente após a validação:

```bash
python3 scripts/publish_story_reference.py publish /absolute/path/reference.json
```

8. Considere sucesso apenas quando a leitura canônica retornar `referenceId`, `templateId`, `revision`, `operation` e `link`.
9. Responda com título, template, quantidade de stories, cobertura, avisos, revisão, operação e deep link.

## Hard Rules

- Exigir `dossierContractVersion: "1.0"`; payload legado ou raso não entra por este fluxo.
- Keep quick, visual, and deep layers for every story.
- Keep the cross-sequence analysis and the 9:16 functional mold.
- Exigir uma entrada `product`, as quatro chaves de síntese e vínculos entre movimentos conceituais e telas do molde.
- Falha de validação precisa acontecer com `networkAccessed: false`.
- Never turn PDF pages, lesson slides, or commentary pages into fake story
  steps. Use `sourceLibrary` for document-wide principles and modules.
- Never request, read, print, or use a Supabase `service_role` key.
- Use only `HERMES_STORY_INGEST_URL`, `HERMES_STORY_INGEST_KEY_ID`, and `HERMES_STORY_INGEST_SECRET`.
- Never claim success before canonical read-back.
- A correction reuses `referenceKey`; do not create a new identity because editorial text changed.
- Do not publish when the user asked only for analysis, preview, or a draft.
