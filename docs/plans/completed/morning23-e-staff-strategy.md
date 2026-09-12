# MORNING23 E — First staff-strategy campaign sequence

## Scope

Delivered one bounded campaign-planning interaction over the accepted campaign,
work, calendar, resource, observation, and persistence systems. It does not
change `PlayerGame`, `SceneConversation`, election arithmetic, office rules, or
shared navigation.

## Implementation

1. Added optional strategy metadata to the existing campaign-action record so
   old saves and purchases remain valid while new actions preserve their
   attributed proposal, represented geography, and approved spending ceiling.
2. Added a feature-local presentation adapter that derives an attributed,
   fallible proposal from information already available to the campaign,
   exposes exact structured choices, and commits only a currently valid choice.
3. Rechecks active staff, committee treasury, geography, and calendar capacity
   at commit. Only active campaign workers join the scheduled activity.
4. Added the structured proposal/priority/geography/ceiling interaction to the
   existing campaign workspace and a report derived from the canonical action.
5. Covered staff, solo planning, disagreement, missing and changed funds,
   departed staff, explicit geography, canonical execution, save/reload, and
   keyboard/pointer use on the ordinary player route.
6. Updated the election system, dependency, integrity, and acceptance records.

## Verification

- `npm exec -- vitest run src/presentation/campaign-strategy.test.ts src/presentation/campaign-projection.test.ts src/presentation/campaign-integration.test.ts src/simulation/campaigns.test.ts` — 58 passed.
- `PLAYWRIGHT_PORT=4187 npm run test:e2e -- tests/e2e/campaign-first-election.spec.ts` — 10 passed.
- `npm run lint` — passed.
- `npm run typecheck` — passed.
- `npm run validate` — passed (311 test files; 4,499 tests passed and 2 skipped).
- `npm run inventory:art` — inventory current at 1,870 items; existing duplicate-hash warnings remain.
- `npm run qa:art` — contact sheet and QA report generated successfully.
- Changed-file Prettier check and `git diff --check` — passed.

The two contract-required campaign copy changes were re-bound through the
canonical prose-anchor tool, and the generated prose inventory was refreshed.

## Stop conditions met

- No staff simulator, hiring rewrite, electorate/geography engine, new office
  rules, national campaign layer, or guaranteed outcome.
- No edits to the shared root, common conversation component, or Section A's
  landing surface.

## LEARN

Advice attribution is mutable campaign state just like money: revalidate the
proposer and committee balance at commitment, then preserve the chosen context
on the canonical action so reporting does not become a second truth store.
