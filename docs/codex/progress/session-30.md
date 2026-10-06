# Session 30 resume marker

## Current item

LW-06 county/city tax-term rows on branch `codex/lw06-county-city-tax-terms`, based on `e591ffc637d1f6db84d2ff920e8662ce123202ed`.

## Done in this draft

- Added `data/laws/budget-and-taxes/lw06-county-city-tax-terms.json` with the exact four LW-06 question/row identities, no invented rates, bases, authority, or numeric estimates.
- Added `src/simulation/law-consequences/modules/lw06-county-city-tax-terms/index.ts` and `index.test.ts`; these attach rows using the existing registered `tax` kind and emit no duplicate kind registration.
- Attached only these four rows in `src/simulation/policy-pack-tax-terms.ts` and covered the attachment in its test.
- Session 9's generic binder draft #2480 head `15d3a3069be4b845b39d43a15ce1da9bac3b5ddb` exposes `bindTaxLawTerms(world, { law, questionKey, proposalId, onDate, cutoff })`. Its latest scope excludes payroll/corporate; owner question #6016048723 asks for the supported contract. No unsupported power or incidence was inferred.

## Checks

- `npx vitest run src/simulation/policy-pack-tax-terms.test.ts src/simulation/law-consequences/modules/lw06-county-city-tax-terms/index.test.ts` — PASS, 2 files / 4 tests.
- `npm run check:law-consequence-modules` — PASS.
- Prettier check on all changed source/data files — PASS.
- `git diff --check` — PASS.
- `npm run typecheck` (includes test imports) — fails only at unchanged `src/simulation/press/press-premise.test.ts:35,125`, each missing `PlaySettings.personalLifeDepiction`.
- Independent `node --import tsx scripts/dev-lab/typecheck-test-imports.ts` — PASS, 804 uncovered test files checked for unresolved imports; 0 unresolved imports.

## Random-place new-game evidence and limit

Seed `session30-lw06-random-tax-20261006` drew Fraser, Colorado (`0828305`) and created a new world on 2026-01-05. It had zero saved tax bases and zero saved tax proposals. Therefore it cannot produce the required law → effect → named-person proof. This is an honest limitation, not runtime acceptance. The current binder and actual local tax base/authority records do not support this chain yet.

## Next

1. Recheck Session 9's binder head and owner response on #2424; rebase after the generic binder lands.
2. Get an approved payroll/corporate tax term and person-incidence contract; keep unknowns unavailable meanwhile.
3. Build a new-game random-place proof with an actual operative LW-06 law, saved tax proposal/base, assessment and named-person landing; do not mark READY before it exists.
4. Re-run the focused Vitest command above and `npm run typecheck`.

Exact next command:

```sh
npm run typecheck
```
