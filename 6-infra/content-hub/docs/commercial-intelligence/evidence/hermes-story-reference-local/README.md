# Hermes Story Reference Publisher - Local Evidence

Execution scope: local worktree only. No remote migration, bucket, secret, Edge Function, frontend deployment, Telegram message, or real reference publication was performed.

## Automated checks

- `npm test`: 207 passed, 0 failed.
- `npm run typecheck`: passed.
- `npm run ci:build:web`: passed.
- `npm run ci:verify-bundle`: passed, including seven secret checks.
- `npm run ci:check:edge`: passed for all Commercial Intelligence Edge Functions.
- `python quick_validate.py hermes-skills/catalog-story-reference`: passed.
- Installed Hermes skill test suite: 9 passed, 0 failed.

## Closed integration

`storyReferenceAgentE2E.test.ts` exercised:

1. the real Python Hermes client;
2. HMAC authentication and nonce claim;
3. deterministic asset uploads;
4. the Edge handler;
5. isolated PGlite migrations and RPCs;
6. canonical database read-back;
7. first creation;
8. identical replay without duplication;
9. correction of the same reference from revision 1 to revision 2;
10. preservation of quick, visual, and deep layers.

## Visual smoke

- `npm run ci:smoke:stories`: passed with 12 screenshots, no horizontal overflow, and no broken evidence images.
- `npm run ci:smoke:raul-dossier`: passed with seven screenshots, two independent templates, three Raul stories, and five protected history-template pages.
- The Raul smoke opened the exact `template` and `reference` deep link and confirmed that both parameters survived hydration.

The browser reported expected failed requests to the deliberately fictitious Supabase fixture host. All intercepted application routes and visual assertions passed.
