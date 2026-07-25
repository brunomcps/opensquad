---
name: catalog-story-reference
description: Use when Bruno explicitly asks Hermes to catalog or publish a completed Instagram story-sequence analysis in the OpenSquad Biblioteca de stories, preserving both the quick and detailed dossier, visual X-ray, visual grammar, 9:16 mold, and preserve/adapt/avoid rules.
---

# Catalogar Referência de Stories

Use esta skill somente depois que Bruno pedir explicitamente para catalogar ou publicar a referência. A análise sozinha não autoriza publicação.

## Workflow

1. Use `story-sequence-template-analysis` to produce the complete dossier. Never replace the detailed analysis with the quick version.
   When the source is a course, PDF, or long document, keep the actual story
   sequence in `reference.items` and place the broader technique catalog in
   `reference.analysis.sourceLibrary`.
2. Copy `templates/reference-payload.json` to a working file outside this skill and fill every placeholder.
3. Read `references/payload-contract.md` when preparing or repairing the payload.
4. Validate before any network operation:

```bash
python3 scripts/publish_story_reference.py validate /absolute/path/reference.json
```

5. Publish only after validation succeeds:

```bash
python3 scripts/publish_story_reference.py publish /absolute/path/reference.json
```

6. Treat the command output as success only when it contains the canonical read-back fields: `referenceId`, `templateId`, `revision`, `operation`, and `link`.
7. Reply with title, template, story count, revision, operation, and deep link.

## Hard Rules

- Keep quick, visual, and deep layers for every story.
- Keep the cross-sequence analysis and the 9:16 functional mold.
- Never turn PDF pages, lesson slides, or commentary pages into fake story
  steps. Use `sourceLibrary` for document-wide principles and modules.
- Never request, read, print, or use a Supabase `service_role` key.
- Use only `HERMES_STORY_INGEST_URL`, `HERMES_STORY_INGEST_KEY_ID`, and `HERMES_STORY_INGEST_SECRET`.
- Never claim success before canonical read-back.
- A correction reuses `referenceKey`; do not create a new identity because editorial text changed.
- Do not publish when the user asked only for analysis, preview, or a draft.
