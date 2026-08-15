# Raul Sena Dossier Fidelity Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Raul Sena story dossier with the approved progressive editorial experience while keeping `História → pequena entrega → CTA` byte-for-byte independent.

**Architecture:** Keep `TemplatesSection` as the data-loading boundary, but move the Raul-specific presentation into focused React components backed by a pure view-model builder. Extend the existing JSONB contracts additively with distinct `quick`, `visual`, and `deep` layers, then migrate only the canonical Raul rows. Route `Usar este molde` through the existing top-level tab state into the existing publication composer with the template preselected.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, Supabase Edge Functions/PostgreSQL JSONB, Node test runner, PGlite, Playwright Core, Cloudflare Pages.

---

## File Map

### Create

- `src/components/commercial-intelligence/story-dossier/visualDossierModel.ts`
  - Detects a complete visual dossier and maps API DTOs to presentation-safe fields.
- `src/components/commercial-intelligence/story-dossier/VisualReferenceDossier.tsx`
  - Owns selected story, sequence mode, anchors, and section composition.
- `src/components/commercial-intelligence/story-dossier/VisualDossierQuickMode.tsx`
  - Renders editorial header, story rail, focused story, sequence overview, and map.
- `src/components/commercial-intelligence/story-dossier/VisualDossierXray.tsx`
  - Renders the three visual inventory cards and visual grammar.
- `src/components/commercial-intelligence/story-dossier/VisualDossierMold.tsx`
  - Renders the three 9:16 wireframes and the use-template action.
- `src/components/commercial-intelligence/story-dossier/VisualDossierDeepAnalysis.tsx`
  - Renders overview, alternating story analysis, synthesis, registered template, transfer, and source note.
- `src/components/commercial-intelligence/story-dossier/storyDossier.css`
  - Contains only the specialized dossier layout and responsive rules.
- `server/services/commercial-intelligence/visualDossierModel.test.ts`
  - Tests layer separation, completeness detection, fallbacks, and independent-template rejection.
- `supabase/migrations/20260725013000_ci_raul_sena_dossier_fidelity.sql`
  - Adds only the canonical Raul presentation fields.

### Modify

- `supabase/functions/_shared/storyContent.ts`
  - Adds and parses `quick`, `deep`, synthesis, registered-template, and editorial presentation fields.
- `ci-app/src/api.ts`
  - Mirrors the shared DTO additions used by React.
- `server/services/commercial-intelligence/storyContent.test.ts`
  - Tests parser acceptance and rejection for the new fields.
- `server/scripts/commercial-intelligence/story-content-migration.test.ts`
  - Executes the new migration twice and proves protected rows are unchanged.
- `src/components/commercial-intelligence/StoryContentView.tsx`
  - Removes the embedded visual dossier implementation, delegates to the new components, and accepts publication-composer navigation props.
- `ci-app/src/StandaloneCommercialIntelligenceView.tsx`
  - Renames the section to `Biblioteca de stories` and carries a preselected template into Publications.
- `ci-app/src/app.css`
  - Removes superseded `.ci-visual-*` rules and retains only shared content styles.
- `server/services/commercial-intelligence/storyContentEdgeContract.test.ts`
  - Verifies component delegation and the publication handoff contract.
- `server/scripts/commercial-intelligence/visual-raul-dossier-smoke.ts`
  - Uses the final schema and validates the approved desktop/mobile experience.
- `package.json`
  - Keeps the existing `ci:smoke:raul-dossier` command; no new dependency is required.

## Task 1: Separate the JSONB presentation layers

**Files:**
- Modify: `supabase/functions/_shared/storyContent.ts`
- Modify: `ci-app/src/api.ts`
- Modify: `server/services/commercial-intelligence/storyContent.test.ts`

- [ ] **Step 1: Write failing parser tests**

Add a test fixture with these exact shapes:

```ts
const quick = {
  roleLabel: 'Story 1 · Identificação e curiosidade',
  title: 'A cena já contém a pergunta narrativa',
  summary: 'Uma situação cotidiana e comprovável abre uma pergunta antes da decisão.',
  evidence: 'O número específico dá aparência de observação real.',
  audienceEffect: 'A pessoa quer descobrir se Raul troca ou se recusa.',
  subtext: 'A viagem comunica status sem dominar o assunto.',
  funnelFunction: 'Relacionamento e resposta espontânea.',
  extractedRule: 'Comece por uma cena que já contenha a pergunta narrativa.',
};

const deep = {
  roleLabel: 'Story 1 · Identificação e curiosidade',
  title: 'A cena e o gancho',
  lead: 'Selfie no avião, uma família ao fundo e um dado específico.',
  sections: [
    {
      title: 'O que ele faz aqui',
      paragraphs: ['A situação cotidiana vira matéria-prima narrativa.'],
      bullets: ['A família comprova a história.', 'O dedo orienta o olhar.'],
    },
  ],
  extractedRule: 'A cena inicial precisa ser específica, discutível e visualmente comprovável.',
};
```

Assert that `parseCreateReferenceInput` preserves `quick`, `visual`, and `deep`
as separate sibling objects. Add rejection assertions for:

- HTML in `quick.title`
- more than 12 `deep.sections`
- more than 20 synthesis blocks
- more than 8 registered-template steps

- [ ] **Step 2: Run the focused test and confirm failure**

Run:

```powershell
node --import tsx --test server/services/commercial-intelligence/storyContent.test.ts
```

Expected: FAIL because `quick`, `deep`, `synthesis`, and
`registeredTemplate` are not parsed yet.

- [ ] **Step 3: Add the exact shared types**

Add:

```ts
export interface StoryQuickAnalysisInput {
  roleLabel: string;
  title: string;
  summary: string;
  evidence: string;
  audienceEffect: string;
  subtext: string;
  funnelFunction: string;
  extractedRule: string;
}

export interface StoryDeepAnalysisInput {
  roleLabel: string;
  title: string;
  lead: string;
  sections: StoryEvidenceSectionInput[];
  extractedRule: string;
}

export interface StorySynthesisInput {
  title: string;
  paragraphs: string[];
}

export interface StoryRegisteredTemplateStepInput {
  title: string;
  description: string;
}

export interface StoryRegisteredTemplateInput {
  name: string;
  steps: StoryRegisteredTemplateStepInput[];
}
```

Extend `StoryEvidenceMetadataInput`:

```ts
quick?: StoryQuickAnalysisInput;
deep?: StoryDeepAnalysisInput;
```

Extend `StoryReferenceAnalysisInput`:

```ts
synthesis?: StorySynthesisInput[];
registeredTemplate?: StoryRegisteredTemplateInput;
sourceNote?: string | null;
```

Extend `StoryTemplateDefinitionInput`:

```ts
editorialName?: string | null;
editorialSummary?: string | null;
```

- [ ] **Step 4: Parse with closed limits**

Use existing `object`, `text`, and `textArray` helpers. Limits:

- quick strings: 2,000 characters
- deep lead/rule: 4,000 characters
- deep sections: 12
- synthesis blocks: 20
- synthesis paragraphs: 12 per block
- registered-template steps: 8
- source note: 2,000 characters

Do not remove or reinterpret legacy fields.

- [ ] **Step 5: Mirror the types in the public API**

Import the shared types into `ci-app/src/api.ts` and add:

```ts
quick?: StoryQuickAnalysisInput;
deep?: StoryDeepAnalysisInput;
```

to `StoryEvidenceMetadataDto`. Keep all current DTO fields for backwards
compatibility.

- [ ] **Step 6: Run tests and typecheck**

Run:

```powershell
node --import tsx --test server/services/commercial-intelligence/storyContent.test.ts
npm run typecheck
```

Expected: all focused tests pass and `tsc -b` exits `0`.

- [ ] **Step 7: Commit**

```powershell
git add 6-infra/content-hub/supabase/functions/_shared/storyContent.ts `
  6-infra/content-hub/ci-app/src/api.ts `
  6-infra/content-hub/server/services/commercial-intelligence/storyContent.test.ts
git commit -m "feat(ci): separate story dossier presentation layers"
```

## Task 2: Add the Raul-only fidelity migration

**Files:**
- Create: `supabase/migrations/20260725013000_ci_raul_sena_dossier_fidelity.sql`
- Modify: `server/scripts/commercial-intelligence/story-content-migration.test.ts`

- [ ] **Step 1: Extend the PGlite test before writing SQL**

Add the new migration path and execute migrations in this order:

```ts
await runMigration(baseMigration);
await runMigration(storyContentMigration);
await runMigration(raulRecoveryMigration);
const protectedBefore = await snapshotIndependentTemplate(db);
await runMigration(raulVisualDossierMigration);
await runMigration(raulFidelityMigration);
await runMigration(raulFidelityMigration);
const protectedAfter = await snapshotIndependentTemplate(db);
assert.deepEqual(protectedAfter, protectedBefore);
```

Assert:

```ts
assert.equal(raul.definition.editorialName, 'Cena comum → lente do especialista → valor pessoal');
assert.equal(raul.items[0].metadata.quick.title, 'A cena já contém a pergunta narrativa');
assert.equal(raul.items[0].metadata.visual.title, 'Cena cotidiana com prova visual');
assert.equal(raul.items[0].metadata.deep.title, 'A cena e o gancho');
assert.equal(raul.analysis.synthesis.length, 4);
assert.equal(raul.analysis.registeredTemplate.steps.length, 4);
```

- [ ] **Step 2: Run the migration test and confirm failure**

Run:

```powershell
node --import tsx --test server/scripts/commercial-intelligence/story-content-migration.test.ts
```

Expected: FAIL because the fidelity migration and fields do not exist.

- [ ] **Step 3: Write an additive, fail-closed migration**

Select only:

```sql
where lower(btrim(name)) = lower('Cena → lente → princípio')
```

and:

```sql
where kind = 'reference'
  and source_url = 'https://www.instagram.com/_raulsena/'
```

Require the primary link before updating. Merge JSONB with `||`; do not replace
the existing objects.

Template presentation:

```json
{
  "editorialName": "Cena comum → lente do especialista → valor pessoal",
  "editorialSummary": "Raul Sena · 3 telas · dossiê completo"
}
```

Reference synthesis:

```json
[
  {
    "title": "Papel de cada tela",
    "paragraphs": ["Story 1: identificação e curiosidade.", "Story 2: recompensa, humor e autoridade.", "Story 3: prova social, posicionamento e confiança."]
  },
  {
    "title": "Mudança de estímulo",
    "paragraphs": ["Rosto → ambiente com gráfico → ambiente com print de seguidor."]
  },
  {
    "title": "Estética e produção",
    "paragraphs": ["Selfie, câmera no chão, print de mensagem e texto nativo do Instagram."]
  },
  {
    "title": "Forças e limitações",
    "paragraphs": ["A sequência combina prova visual, humor, autoridade indireta e status atribuído por terceiro.", "O gráfico é pouco legível e a piada depende de contexto."]
  }
]
```

Registered template:

```json
{
  "name": "Cena comum → lente do especialista → valor pessoal",
  "steps": [
    {"title": "Cena real com pequeno conflito", "description": "Acontecimento banal, específico e visualmente comprovável."},
    {"title": "Virada de nicho", "description": "Piada, dado ou interpretação que somente aquele especialista faria."},
    {"title": "Resposta do público", "description": "Comentário ou mensagem vira continuação narrativa."},
    {"title": "Declaração de princípio", "description": "A resposta revela como o criador pensa e toma decisões."}
  ]
}
```

Use a `values` table keyed by `narrative_order` to merge exact `quick` and
`deep` objects into each of the three item metadata objects. Keep the existing
`visual` objects unchanged.

- [ ] **Step 4: Prove idempotence and isolation**

Run:

```powershell
node --import tsx --test server/scripts/commercial-intelligence/story-content-migration.test.ts
```

Expected: all tests pass, including the protected-template deep snapshot after
two executions.

- [ ] **Step 5: Commit**

```powershell
git add 6-infra/content-hub/supabase/migrations/20260725013000_ci_raul_sena_dossier_fidelity.sql `
  6-infra/content-hub/server/scripts/commercial-intelligence/story-content-migration.test.ts
git commit -m "feat(ci): add Raul dossier fidelity data"
```

## Task 3: Build a pure dossier view model

**Files:**
- Create: `src/components/commercial-intelligence/story-dossier/visualDossierModel.ts`
- Create: `server/services/commercial-intelligence/visualDossierModel.test.ts`

- [ ] **Step 1: Write failing model tests**

Test these public functions:

```ts
hasCompleteVisualDossier(reference): boolean
buildVisualDossierViewModel(template, reference): VisualDossierViewModel
```

Assertions:

- all three items must contain `quick`, `visual`, and `deep`
- source URL must be exactly the canonical Raul URL
- item order is `narrativeOrder`
- editorial template name comes from `definition.editorialName`
- quick, visual, and deep titles remain different
- a `Stories para Enriquecer` reference returns `false`
- incomplete data returns `false`, never a partially mixed dossier

- [ ] **Step 2: Run the model test and confirm failure**

Run:

```powershell
node --import tsx --test server/services/commercial-intelligence/visualDossierModel.test.ts
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the model interfaces**

Use:

```ts
export interface VisualDossierStory {
  itemId: string;
  narrativeOrder: number;
  assetUrl: string;
  quick: StoryQuickAnalysisInput;
  visual: StoryVisualAnalysisInput;
  deep: StoryDeepAnalysisInput;
}

export interface VisualDossierViewModel {
  templateId: string;
  editorialName: string;
  editorialSummary: string;
  apparentSubject: string;
  stories: VisualDossierStory[];
  sequenceMap: StorySequenceMapItemInput[];
  overview: string[];
  visualGrammar: string;
  synthesis: StorySynthesisInput[];
  productRevealed: string;
  registeredTemplate: StoryRegisteredTemplateInput;
  transferRules: string[];
  sourceNote: string;
}
```

Fail with an explicit `Error('Dossiê visual incompleto.')` only when
`buildVisualDossierViewModel` is called directly with incomplete data.

- [ ] **Step 4: Run focused tests**

Run:

```powershell
node --import tsx --test server/services/commercial-intelligence/visualDossierModel.test.ts
```

Expected: all model tests pass.

- [ ] **Step 5: Commit**

```powershell
git add 6-infra/content-hub/src/components/commercial-intelligence/story-dossier/visualDossierModel.ts `
  6-infra/content-hub/server/services/commercial-intelligence/visualDossierModel.test.ts
git commit -m "refactor(ci): isolate visual dossier view model"
```

## Task 4: Rebuild the quick mode and library shell

**Files:**
- Create: `src/components/commercial-intelligence/story-dossier/VisualReferenceDossier.tsx`
- Create: `src/components/commercial-intelligence/story-dossier/VisualDossierQuickMode.tsx`
- Modify: `src/components/commercial-intelligence/StoryContentView.tsx`
- Modify: `ci-app/src/StandaloneCommercialIntelligenceView.tsx`
- Modify: `server/services/commercial-intelligence/storyContentEdgeContract.test.ts`

- [ ] **Step 1: Write source-contract assertions**

Assert that:

```ts
assert.match(standalone, /rotulo:\s*'Biblioteca de stories'/);
assert.match(storyView, /VisualReferenceDossier/);
assert.doesNotMatch(storyView, /function VisualReferenceDossier/);
assert.doesNotMatch(storyView, /Dossiê vivo · versão/);
```

Read the new quick component and assert:

```ts
for (const copy of [
  'Modo rápido · Referência e template juntos',
  'Sequência completa',
  'Ver raio-X visual',
  'Abrir análise completa',
]) assert.match(quickSource, new RegExp(copy));
```

- [ ] **Step 2: Run the contract test and confirm failure**

Run:

```powershell
node --import tsx --test server/services/commercial-intelligence/storyContentEdgeContract.test.ts
```

Expected: FAIL because the old embedded component and labels remain.

- [ ] **Step 3: Implement the container state and anchor IDs**

`VisualReferenceDossier` owns:

```ts
const [activeIndex, setActiveIndex] = useState(0);
const [showSequence, setShowSequence] = useState(false);
```

Use stable IDs:

```ts
const ids = {
  top: `dossier-${model.templateId}`,
  visual: `dossier-${model.templateId}-visual`,
  deep: `dossier-${model.templateId}-deep`,
};
```

Anchor helper:

```ts
function focusSection(id: string) {
  const target = document.getElementById(id);
  target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  target?.focus({ preventScroll: true });
}
```

Sections use `tabIndex={-1}`.

- [ ] **Step 4: Implement the quick mode**

Required hierarchy:

```tsx
<section className="ci-dossier-quick">
  <header className="ci-dossier-quick-head" />
  <nav className="ci-dossier-story-rail" aria-label="Stories da referência" />
  {showSequence ? <SequenceOverview /> : <FocusedStory />}
</section>
<SequenceMap />
```

`FocusedStory` must read only `story.quick` for its title and narrative copy.
It may read `story.visual.markers` only for image annotations.

Buttons call `onOpenVisual` and `onOpenDeep`; they do not toggle hidden content.

- [ ] **Step 5: Simplify `TemplatesSection`**

Keep data loading and template selection. For a complete dossier:

```tsx
<VisualReferenceDossier
  template={selected}
  reference={visualReference}
  linkedPublications={linkedPublications}
  onUseTemplate={onUseTemplate}
/>
```

For all other templates, preserve the existing generic branch unchanged.

Remove the generic section header and `ci-story-dossier-head` only from the
complete visual-dossier path.

- [ ] **Step 6: Rename the navigation surface**

Change:

```ts
{ chave: 'content-templates', rotulo: 'Biblioteca de stories', icone: '▦', copy: 'Navegação rápida, evidências concretas e análise completa no mesmo dossiê.' }
```

Do not rename other tabs.

- [ ] **Step 7: Run contract tests and typecheck**

Run:

```powershell
node --import tsx --test server/services/commercial-intelligence/storyContentEdgeContract.test.ts
npm run typecheck
```

Expected: focused tests and typecheck pass.

- [ ] **Step 8: Commit**

```powershell
git add 6-infra/content-hub/src/components/commercial-intelligence/story-dossier `
  6-infra/content-hub/src/components/commercial-intelligence/StoryContentView.tsx `
  6-infra/content-hub/ci-app/src/StandaloneCommercialIntelligenceView.tsx `
  6-infra/content-hub/server/services/commercial-intelligence/storyContentEdgeContract.test.ts
git commit -m "feat(ci): rebuild Raul dossier quick mode"
```

## Task 5: Restore X-ray, mold, and full analysis

**Files:**
- Create: `src/components/commercial-intelligence/story-dossier/VisualDossierXray.tsx`
- Create: `src/components/commercial-intelligence/story-dossier/VisualDossierMold.tsx`
- Create: `src/components/commercial-intelligence/story-dossier/VisualDossierDeepAnalysis.tsx`
- Create: `src/components/commercial-intelligence/story-dossier/storyDossier.css`
- Modify: `src/components/commercial-intelligence/story-dossier/VisualReferenceDossier.tsx`
- Modify: `ci-app/src/app.css`

- [ ] **Step 1: Add all approved sections**

Compose in this exact order:

```tsx
<VisualDossierQuickMode />
<VisualDossierXray id={ids.visual} />
<VisualDossierMold onUseTemplate={onUseTemplate} />
<VisualDossierDeepAnalysis id={ids.deep} onBackToQuick={() => focusSection(ids.top)} />
<VisualDossierApplication linkedPublications={linkedPublications} />
```

There is no tab navigation.

- [ ] **Step 2: Implement the X-ray using only visual fields**

Render exactly three articles. Card headings come from `story.visual.title`.
Render swatches as non-text color controls with `title={color}`.

- [ ] **Step 3: Implement the mold**

Use the existing template `moldSteps`. Render placeholder classes by kind:

```tsx
className={`ci-dossier-placeholder is-${placeholder.kind}`}
```

The `Usar este molde` button calls `onUseTemplate(model.templateId)`.

- [ ] **Step 4: Implement the deep analysis using only deep fields**

Render:

- dark overview card
- three alternating story articles
- synthesis grid
- product-revealed callout
- registered template with four numbered steps
- transfer rules
- source note

Deep headings come from `story.deep.title`, never `story.visual.title`.

- [ ] **Step 5: Port the approved layout rules**

Use these stable constraints:

```css
.ci-dossier-stage { max-width: 1180px; margin: 0 auto; }
.ci-dossier-layout { display: grid; grid-template-columns: 220px minmax(0, 1fr); gap: 14px; }
.ci-dossier-focus { display: grid; grid-template-columns: minmax(300px, .9fr) minmax(0, 1.45fr); }
.ci-dossier-xray-grid,
.ci-dossier-mold-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
.ci-dossier-phone { aspect-ratio: 9 / 16; }
```

At `max-width: 760px`:

```css
.ci-dossier-layout,
.ci-dossier-focus,
.ci-dossier-xray-grid,
.ci-dossier-mold-grid,
.ci-dossier-deep-story { grid-template-columns: 1fr; }
.ci-dossier-deep-story.is-reverse > * { order: initial; }
```

Do not scale type with viewport width. Do not add gradients or nested cards.

- [ ] **Step 6: Remove superseded styles**

Delete the old `.ci-visual-*` block from `ci-app/src/app.css` only after the new
stylesheet is imported and typecheck/build pass.

- [ ] **Step 7: Build**

Run:

```powershell
npm run typecheck
npm run ci:build:web
```

Expected: both exit `0`.

- [ ] **Step 8: Commit**

```powershell
git add 6-infra/content-hub/src/components/commercial-intelligence/story-dossier `
  6-infra/content-hub/ci-app/src/app.css
git commit -m "feat(ci): restore full Raul dossier layers"
```

## Task 6: Connect `Usar este molde` to the existing publication form

**Files:**
- Modify: `ci-app/src/StandaloneCommercialIntelligenceView.tsx`
- Modify: `src/components/commercial-intelligence/StoryContentView.tsx`
- Modify: `server/services/commercial-intelligence/storyContentEdgeContract.test.ts`

- [ ] **Step 1: Write the handoff contract test**

Assert that the standalone view contains:

```ts
const [publicationTemplateId, setPublicationTemplateId] = useState<string | null>(null);
```

and that `StoryContentView` receives:

```tsx
onUseTemplate={templateId => {
  setPublicationTemplateId(templateId);
  setTab('content-publications');
}}
```

Assert that `PublicationForm` accepts `initialTemplateId` and initializes:

```ts
publication?.template?.templateId || initialTemplateId || templates[0]?.templateId || ''
```

- [ ] **Step 2: Run the contract test and confirm failure**

Run:

```powershell
node --import tsx --test server/services/commercial-intelligence/storyContentEdgeContract.test.ts
```

Expected: FAIL because no cross-tab handoff exists.

- [ ] **Step 3: Implement the parent-owned handoff**

Add optional props:

```ts
interface StoryContentViewProps {
  section: StoryContentSection;
  role: MemberRole;
  initialTemplateId?: string | null;
  onUseTemplate?: (templateId: string) => void;
  onInitialTemplateConsumed?: () => void;
}
```

When Publications mounts with `initialTemplateId`:

- open creation mode
- preselect the template
- call `onInitialTemplateConsumed` after state initialization

Do not auto-submit.

- [ ] **Step 4: Run focused tests and typecheck**

Run:

```powershell
node --import tsx --test server/services/commercial-intelligence/storyContentEdgeContract.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add 6-infra/content-hub/ci-app/src/StandaloneCommercialIntelligenceView.tsx `
  6-infra/content-hub/src/components/commercial-intelligence/StoryContentView.tsx `
  6-infra/content-hub/server/services/commercial-intelligence/storyContentEdgeContract.test.ts
git commit -m "feat(ci): open publication composer from story mold"
```

## Task 7: Upgrade the visual smoke to the approved experience

**Files:**
- Modify: `server/scripts/commercial-intelligence/visual-raul-dossier-smoke.ts`

- [ ] **Step 1: Replace the fixture with the final schema**

Every Raul item must include distinct `quick`, `visual`, and `deep` titles.
Reference analysis must include the four synthesis blocks and the registered
template. The independent fixture keeps five PDF pages and no visual dossier.

- [ ] **Step 2: Add desktop interaction assertions**

Verify:

- initial heading is `Biblioteca de stories`
- no `Dossiê vivo · versão`
- no `Leitura`, `Arquitetura`, `Template`, or `Aplicação` tablist
- each story selection changes the quick title
- `Sequência completa` shows all three images
- `Ver raio-X visual` reaches the X-ray section
- `Abrir análise completa` reaches the deep section
- `Voltar ao modo rápido` returns to the quick section
- `Usar este molde` opens Publications with the Raul template selected

- [ ] **Step 3: Add content-completeness assertions**

Verify:

- 3 X-ray cards
- 3 mold phones
- 3 deep story articles
- 4 synthesis cards
- 4 registered-template steps
- transfer rules and source note

- [ ] **Step 4: Protect the independent template**

Select `História → pequena entrega → CTA` and verify:

- generic `Regras do método`
- reference `Stories para Enriquecer`
- 5 evidence images
- no `.ci-dossier-quick`
- no Raul copy

- [ ] **Step 5: Capture visual evidence**

Save:

```text
docs/commercial-intelligence/evidence/raul-dossier-fidelity/
├── desktop-quick.png
├── desktop-xray.png
├── desktop-mold.png
├── desktop-deep.png
├── mobile-quick.png
├── mobile-deep.png
└── mobile-independent-template.png
```

Assert horizontal overflow is at most `1px` at `1440×1000`, `1920×1080`, and
`390×844`.

- [ ] **Step 6: Run smoke**

Run:

```powershell
$env:CI_PREVIEW_URL='http://127.0.0.1:4186'
$env:VITE_SUPABASE_URL='https://vdaualgktroizsttbrfh.supabase.co'
npm run ci:smoke:raul-dossier
```

Expected JSON:

```json
{
  "ok": true,
  "templatesVerified": 2,
  "raulStories": 3,
  "historyPages": 5,
  "screenshots": 7
}
```

- [ ] **Step 7: Inspect every screenshot**

Reject the build if:

- the generic administrative header precedes quick mode
- a quick heading uses a visual title
- a deep heading uses a visual title
- any anchor action is missing
- X-ray or mold columns are uneven
- mobile has overlap or clipped actions

- [ ] **Step 8: Commit**

```powershell
git add 6-infra/content-hub/server/scripts/commercial-intelligence/visual-raul-dossier-smoke.ts
git commit -m "test(ci): lock Raul dossier visual fidelity"
```

## Task 8: Full verification and production rollout

**Files:**
- Verify all modified files
- No new implementation file unless a failing check requires a scoped fix

- [ ] **Step 1: Run the complete local gate**

```powershell
npm test
npm run typecheck
npm run ci:build:web
npm run ci:check:edge
npm run ci:smoke:raul-dossier
```

Expected:

- all Node tests pass
- typecheck exits `0`
- Vite build exits `0`
- Deno Edge check exits `0`
- visual smoke returns `ok: true`

- [ ] **Step 2: Record the protected production hash**

Run the existing independent-template hash query before migration and save the
returned hash in the rollout notes.

- [ ] **Step 3: Apply only the new migration**

Do not use `supabase db push`, because unrelated local migrations are pending.

```powershell
npx supabase db query --linked --file supabase/migrations/20260725013000_ci_raul_sena_dossier_fidelity.sql
npx supabase migration repair --status applied 20260725013000
```

Expected: query succeeds and only version `20260725013000` is repaired as
applied.

- [ ] **Step 4: Re-run the protected hash**

Expected: the hash is identical to Step 2.

- [ ] **Step 5: Deploy the Edge Function**

```powershell
npx supabase functions deploy ci-content --project-ref vdaualgktroizsttbrfh
```

Expected: `Deployed Functions.`

- [ ] **Step 6: Build with the current public production configuration**

Extract the public Supabase URL and publishable key from the currently deployed
bundle without printing the key:

```powershell
$index = Invoke-WebRequest -Uri 'https://opensquad-commercial-intelligence.pages.dev' -UseBasicParsing
$asset = [regex]::Match($index.Content, 'src="([^"]+\.js)"').Groups[1].Value
$javascript = (Invoke-WebRequest -Uri ('https://opensquad-commercial-intelligence.pages.dev' + $asset) -UseBasicParsing).Content
$env:VITE_SUPABASE_URL = [regex]::Match($javascript, 'https://[a-z0-9-]+\.supabase\.co').Value
$env:VITE_SUPABASE_PUBLISHABLE_KEY = [regex]::Match($javascript, 'sb_publishable_[A-Za-z0-9_-]+').Value
if (-not $env:VITE_SUPABASE_URL -or -not $env:VITE_SUPABASE_PUBLISHABLE_KEY) {
  throw 'Configuração pública de produção não encontrada.'
}
npm run ci:build:web
```

The publishable key is public bundle configuration, not a service-role secret.
Do not print its value.

- [ ] **Step 7: Deploy Cloudflare Pages**

```powershell
npx wrangler pages deploy dist-ci --project-name opensquad-commercial-intelligence --branch main
```

Expected: deployment status `Production` and the alias
`https://opensquad-commercial-intelligence.pages.dev` serves the new asset.

- [ ] **Step 8: Validate authenticated production**

In the existing authenticated browser:

- open `Biblioteca de stories`
- verify the Raul quick title, X-ray, mold, deep analysis, and application handoff
- switch to `História → pequena entrega → CTA`
- verify five evidence pages and absence of Raul layers

- [ ] **Step 9: Push the branch and update the PR**

```powershell
git push origin codex/commercial-intelligence-story-recovery
```

Update PR `#1` with final test totals, migration version, deployment ID, and
production verification result.

## Plan Self-Review

- Every approved screen layer maps to a task and component.
- The three title meanings use different fields and different renderers.
- The four obsolete tabs are explicitly excluded and tested absent.
- `Usar este molde` has a real cross-tab destination.
- The protected template is checked in parser, migration, smoke, and production.
- No new dependency, duplicate publication form, destructive migration, or
unrelated refactor is introduced.
- No placeholder or unresolved implementation choice remains.
