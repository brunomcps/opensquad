# Payload Contract

The payload is a single JSON object. The client computes `referenceKey` when absent, computes every asset hash and size, and always recomputes `contentHash`.

## Required top-level objects

- `template`: exact reusable template identity and definition.
- `reference`: source identity, complete analysis, and ordered stories.
- `assets`: one local file descriptor for every non-text story.
- `referenceKey`: optional on first publication, mandatory to preserve from the receipt for later corrections.

## Template

`template.canonicalKey` is a stable lowercase slug with hyphens. `definition` must include:

- `formula`, `editorialName`, and `editorialSummary`;
- non-empty `preserveRules`, `adaptRules`, and `avoidRules`;
- non-empty `steps`;
- non-empty `moldSteps`, each with functional 9:16 placeholders.

Exact canonical identity is required. Never match an existing template by substring.

## Reference

Keep `title`, `description`, `platform`, `sourceAccount`, source dates/URL when known, `analysis`, and `items`.

Cross-sequence `analysis` requires:

- `summary` and `overview`;
- `sequenceMap`;
- `visualGrammar`;
- `productRevealed`;
- `transferRules`;
- `synthesis`;
- `registeredTemplate.name` and `registeredTemplate.steps`.

## Long source documents

When a course, PDF, or other long document contains a real story sequence plus
broader methodology, keep those layers separate:

- `reference.items` contains only the actual ordered story screens;
- `reference.analysis.sourceLibrary` contains the document-wide catalog;
- lesson pages are provenance, not invented narrative steps.

`sourceLibrary` includes document metadata, categories, and continuous ordered
modules. Every module must include its page range, quick summary, principles,
techniques, cautions, Bruno applications, and a reusable mold. Do not republish
the full source document or long verbatim passages.

Every item uses continuous `narrativeOrder` starting at 1 and contains distinct layers:

- `metadata.quick`: compact navigation layer;
- `metadata.visual`: scene, typography, composition, palette, graphic evidence, and visual impression;
- `metadata.deep`: complete story analysis, sections, and extracted rule.

The quick layer never replaces the detailed layer.

## Assets

Each visual item has exactly one descriptor:

```json
{
  "narrativeOrder": 1,
  "localPath": "/absolute/path/story-1.jpg",
  "mimeType": "image/jpeg"
}
```

Allowed MIME types: JPEG, PNG, WebP, MP4, and WebM. Maximum size is 20 MiB per asset and 200 MiB total. The client strips `localPath` before transmission.

## Identity and revisions

Keep the receipt's `referenceKey` for corrections. Identical `referenceKey` and `contentHash` reuse the receipt. The same `referenceKey` with changed editorial content or asset hashes creates a new revision of the same reference.

The receipt contains no credential. It is written only after the endpoint returns and the canonical read-back matches.
