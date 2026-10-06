# Session 46 b18 part 4: groups for any shared cause

## Implemented

- Added a bounded consumer API in `law-interest-groups.ts` for forming and joining a neighborhood group from a saved cause event, recorded private view or own law stake, existing goal, social ties, and recorded life load.
- The group leader can weigh their recorded action goal and member arguments they actually know about on a recorded decision day. The result is a durable decision trace. A member can record an action argument against an already saved scene event.
- Added a generated new-game test using a place selected from the 56 place catalog. It confirms two generated residents with recorded views form and join a group, a heard member argument informs the leader's choice, and the resulting world passes integrity.

## Boundaries and blockers

- No group meeting or decision-day producer is in this part's owned files. Petition, protest, letter-drive, endorsement, testimony, and lawsuit execution remains with the respective action writers; this module records the leader's selected intent only.
- The legacy `joinLawInterestGroup` entry point and its prior fixed-threshold behavior remain intact because the existing base regression in `law-exposure.test.ts` is outside this part's owned files. The newly added API is not wired into a production caller in this PR.
- Two pre-existing tests in `law-interest-groups.test.ts` fail before their assertions in the shared fixture setup with `Pay coverage must retain every applicable dated law and exception`. This is separate from the new generated-place test, which is run independently and passes.
- Repository `npm run typecheck` reports two existing errors in `src/simulation/press/press-premise.test.ts` (`PlaySettings.personalLifeDepiction` missing); no diagnostics point to these p4 files. The typecheck command stops before the test-import check.

## Verification

- `npx vitest run --config /tmp/vitest-lite.config.mts src/simulation/living-world/law-interest-groups.test.ts -t "forms and joins a cause group"` — passing. The temporary config avoids the repository Vite config's `spawnSync git status` call, which is blocked in this sandbox.
- `npm run typecheck` — blocked by the two existing `press-premise.test.ts` errors above.
