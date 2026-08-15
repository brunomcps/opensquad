# Raul Sena visual dossier recovery

## Goal

Recover the approved Raul Sena story dossier from
`C:\tmp\story-redesign-comparison\visual-template.html` inside the real
Commercial Intelligence application.

The recovery must preserve the independent `História → pequena entrega → CTA`
template and its `Stories para Enriquecer` reference without modifying their
definition, evidence, links, or UI behavior.

## Data boundaries

The Raul dossier remains attached only to:

- template: `Cena → lente → princípio`
- reference source: `https://www.instagram.com/_raulsena/`
- three Raul story items in narrative order

The rich data is stored in the existing JSONB boundaries:

- template `definition`: formula, rules, mold steps, fixed functions, and
  visual placeholders
- reference `analysis`: sequence summary, arc, reasons it works, template fit,
  visual grammar, and product revealed
- item `metadata`: source excerpt, evidence, audience effect, subtext, funnel
  function, extracted rule, visual inventory, palette, markers, and impression

Unknown rich fields are parsed and validated by the shared edge contract before
they can be written through the application.

## Interface

When a selected template has a linked reference with a visual dossier, the
template page renders:

1. a quick three-story rail with an interactive focused story
2. the original evidence, audience effect, subtext, funnel function, and rule
3. the sequence map
4. a visual X-ray for all three stories
5. the visual grammar summary
6. a 9:16 placeholder storyboard
7. preserve, adapt, and avoid rules
8. the existing full evidence analysis below

Templates without this optional data continue through the current generic
dossier. This keeps `História → pequena entrega → CTA` unchanged.

## Migration

Create an additive migration after the compact Raul recovery migration. It only
updates rows identified by the Raul template name and canonical Instagram URL.
It must fail if either canonical Raul row is missing instead of selecting or
rewriting another template.

The migration does not insert, update, archive, relink, or delete:

- `História → pequena entrega → CTA`
- `Stories para Enriquecer`
- their five evidence items

## Verification

- parser tests cover the new optional rich fields and reject invalid values
- migration tests prove the Raul-only scope and the protected template
- existing story-content tests remain green
- typecheck and production build pass
- Playwright validates desktop and mobile layouts, story selection, image
  loading, and absence of overlap
- production data is checked after migration for two distinct templates and
  their correct primary references

## Self-review

- No placeholders or unresolved decisions remain.
- The data model and UI activation use the same optional-field boundary.
- The migration scope is canonical and does not rely on ordering.
- The implementation is limited to the approved Raul recovery and its tests.
