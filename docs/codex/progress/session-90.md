# Constituent calls now carry real reasons

Residents now contact officials about recorded events in their lives instead of an invented topic. Calls without such a record remain honest general-opinion calls, while ward residents can reach the member who represents them. The change is ready locally but cannot yet be published or behavior-tested in this checkout.

## Current item

`b06-p1` — The contact says something.

## What changed

- **MEASURED:** Contact events cite recorded law exposure, lived outcome, official-view, or law-interest-group reasons. `src/simulation/living-world/civic-actions.ts:112`
- **MEASURED:** A resident with no recorded issue makes an explicitly labeled general-opinion call. `src/simulation/living-world/civic-actions.ts:174`
- **MEASURED:** Residents without an existing view contact their recorded ward representative when their local government uses ward seats. `src/simulation/living-world/civic-actions.ts:287`
- **MEASURED:** The nationwide civic-actions test checks that every contact carries its reason chain. `tests/nationwide/town-civic-actions.test.ts:315`

## Publication state

The working branch is `session90-b06-p1`, based on the only available repository head, `e591ffc637d1f6db84d2ff920e8662ce123202ed`. The implementation and this marker share one local commit. This checkout has no Git remote, and `gh auth status` reports no authenticated GitHub host. Session 90 therefore could not post the required claim on issue #2424, push the branch, or create the live pull request from this environment.

## Next command

After attaching the Git remote and GitHub authentication, run:

```sh
gh issue comment 2424 --body 'Session 90 takes b06-p1' && git push -u origin session90-b06-p1
```

Then rerun the focused test when storage headroom is available and open the READY pull request against `main`.

## Checks

- **Passed:** `npx prettier --check src/simulation/living-world/civic-actions.ts tests/nationwide/town-civic-actions.test.ts`
- **Passed:** `npx eslint src/simulation/living-world/civic-actions.ts tests/nationwide/town-civic-actions.test.ts`
- **Passed:** `npm run zero-dice`
- **Environment limit:** `npm run storage -- run test -- npx vitest run tests/nationwide/town-civic-actions.test.ts --reporter=verbose` was refused because no space was usable above the 25 GiB reserve.
- **Existing failure:** `npm run typecheck` reached two `press-premise.test.ts` fixture errors about the required `personalLifeDepiction` setting.
- **Checkout limit:** `npm run release:check -- --mode pr` could not resolve its configured baseline commit in this single-ref checkout.
