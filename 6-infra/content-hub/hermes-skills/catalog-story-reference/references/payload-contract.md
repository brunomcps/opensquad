# Payload Contract 1.0

Read `../../_shared/canonical-story-dossier-contract.md` before authoring and
validate against `../../_shared/canonical-story-dossier.schema.json`.

The JSON Schema governs required fields, types, enums, and cardinality. The
shared Markdown contract governs editorial meaning. The Python publisher adds
cross-field, coverage, anti-impoverishment, asset, and read-back checks.

## Top level

- `dossierContractVersion` must be `"1.0"`.
- `template`, `reference`, and `assets` are required.
- `referenceKey` is optional on first publication and stable on corrections.
- The client computes asset metadata and always recomputes `contentHash`.

## Template

Use an exact, stable `canonicalKey`; never match an existing template by
substring.

`template.definition` requires:

- editorial name, summary, and formula;
- specific preserve, adapt, and avoid rules;
- legacy `steps` identical to root `template.steps`;
- complete `moldSteps`.

Every mold screen has a stable `id`, one or more `templateStepIds`, a purpose, a
fixed function, and at least two functional placeholders. It needs one message
placeholder (`copy` or `principle`) and one scene/evidence placeholder
(`scene`, `person`, `proof`, or `response`).

## Reference and provenance

`reference.sequenceConfirmed` must be `true` and
`sequenceConfirmationSource` must say who or what confirmed completeness.

Every story:

- uses continuous `narrativeOrder`, already sorted from 1;
- contains `sourceExcerpt` or `noSourceTextReason`, never both;
- preserves distinct `quick`, `visual`, and `deep` layers;
- includes `deep.dimensionAssessments.interaction` and `.critique`;
- declares `deep.sections[].covers`;
- explicitly covers `narrative` and `continuity` in deep sections.

The complete item must cover:

- `evidence`;
- `attention`;
- `narrative`;
- `continuity`;
- `funnel`;
- `subtext`;
- `template-consequence`.

## Sequence analysis

`reference.analysis.sequenceMap` contains one ordered `story` entry per item and
exactly one `product` entry without `storyOrder`.

Keep:

- summary, overview, narrative arc, why it works, and template fit;
- visual grammar;
- apparent product, strategic product, and constructed persona;
- transfer rules and source limitations;
- exactly four synthesis keys:
  - `screen-roles`;
  - `stimulus-change`;
  - `aesthetics-production`;
  - `strengths-limitations`.

## Operational template

`registeredTemplate` includes formula, use case, primary function, required and
optional elements, execution risks, captures or inputs, Bruno adaptation, and
3 to 6 conceptual movements.

Each movement needs:

- stable `id`;
- title and description;
- mechanism;
- condition;
- expected result;
- one or more `evidenceStoryOrders`.

Every conceptual movement must be linked from at least one mold screen.

## Long source documents

For a course, PDF, or long document:

- keep only real story screens in `reference.items`;
- put the broader catalog in `reference.analysis.sourceLibrary`;
- use pages as provenance, never as invented story steps;
- do not reproduce long source passages.

## Assets

Each non-text story has exactly one local descriptor:

```json
{
  "narrativeOrder": 1,
  "localPath": "/absolute/path/story-1.jpg",
  "mimeType": "image/jpeg"
}
```

Allowed types: JPEG, PNG, WebP, MP4, and WebM. Maximum size is 20 MiB per asset
and 200 MiB total. The client verifies bytes, computes hash and size, uploads,
and removes `localPath` from the transmitted payload.

## Validation and publication

Run:

```bash
python3 scripts/publish_story_reference.py validate /absolute/path/reference.json
```

A failed validation must report `networkAccessed: false`.

Publish only after validation:

```bash
python3 scripts/publish_story_reference.py publish /absolute/path/reference.json
```

Success requires canonical read-back with `referenceKey`, `referenceId`,
`templateId`, `contentHash`, `revision`, `operation`, and `link`. The receipt
contains no credential.
