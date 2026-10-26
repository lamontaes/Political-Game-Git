# Session 51 resume marker

## Active item

- b27-p1, rent and housing bill never unknown, on branch `session-51-b27-p1` from main `e591ffc637d1f6db84d2ff920e8662ce123202ed`.
- Current live POOL still lists b27-p1 through b27-p6 as claimed by S51. Latest Fable routing map is issue #2424 comment 6015577087; economy-bank queue includes b27. The current CTO wake list #6015919040 names b27 for Session 7, while this existing S51 claim and prior assignment are still in progress.

## Done in the local draft

- Added population-weighted HUD state/territory rent aggregates and estimated provenance for playable place fallbacks without a Census county link.
- Updated the housing bill read API so no household contract is an empty result rather than a null/unknown amount.
- Updated selected-jurisdiction and lease tests, including American Samoa's estimated HUD-based lease.
- Wired the ordinary new-game opening to create the primary player's rented-home lease immediately; later homes still enter through scheduled rent day. The random rent-place opening test now checks the player's own primary household lease.
- Posted initial measured progress to #2424 comment 6015959629, opening/test status to comment 6016150465, and test results to comment 6016302548.

## Still to do

- Focused p1 Vitest: 67 passed, 63 skipped by name filter across the opening, mortgage, and territory regressions. After correcting state aggregates to use county rows only (no double-counting town rows), a second focused run passed 57 tests (all 56 rent rows plus the territory estimate). No test failures. Typecheck shows only unchanged `press-premise.test.ts` `personalLifeDepiction` errors. ESLint, Prettier, `git diff --check`, `zero-dice`, and `export-town-rent.ts --check` pass.
- Complete a random-place opening proof that confirms the player's actual primary household has a rent bill before money screens are shown.
- b27-p2 has an isolated draft branch `/tmp/Political-Game-Git-b27-p2` with the six-category price table; its five tests passed with a documented bounded storage override. The integration into `cost-of-living.ts` remains to be done after p1 is published/rebased.
- Complete one b27-p1 PR and keep remaining b27 parts separate. New-game random-place proof and integration after other numbered parts remain required by the assignment.
- After p1 is done, continue the next b27 part from fresh POOL/board status; do not switch ownership based on the wake-list session number without checking current progress.
