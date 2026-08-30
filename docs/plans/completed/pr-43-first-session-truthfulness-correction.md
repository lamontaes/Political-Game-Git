# PR #43 First-Session Truthfulness Correction

## Objective

Apply the smallest same-lineage correction to the open first-session recovery
PR: free-text player history anchors must remain geographically unknown, and
birthplace, hometown, and current residence must be independently required at
the TypeScript and runtime life-start boundaries.

## Constraints preserved

- The accepted Title/Life flow, visual design, office/developer regression
  routes, campaign/election implementation, and Stage 6 semantics are intact.
- No player-authored anchor text is parsed for a place or other entity.
- One place role is never substituted for another, and no replacement default
  is introduced.
- The correction validates only already accepted bounds; it creates no product
  limits.

## Validation record

- Focused life-start and browser persistence tests: 18 passed.
- First-session Playwright tests: 6 passed.
- Full Vitest: 38 files and 631 tests passed.
- Full Playwright: 61 tests passed.
- Format, lint, typecheck, production build, deterministic demo, and
  `npm run validate` passed.
- `npm run validate:art`, `npm run inventory:art`, and `npm run qa:art`
  passed; first-session evidence was regenerated as actual PNG screenshots at
  1440x900, 1280x800, and 390x844.

## Learn pass

New-game prose is not structured evidence. Whenever a setup writer receives
only free text, it must preserve unknown values rather than borrowing nearby
present-state facts; a direct runtime test must cover the JavaScript caller
that bypasses TypeScript.
