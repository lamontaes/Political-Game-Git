---
id: core-moves-pinned-and-income-stopgaps
title: "Movers with a pinned job or a household income award can leave (two stopgap rows in moves)"
area: core
kind: stopgap
priority: 2
size: M
status: in-pr
claimed-by: claude/moves-pinned-income
pr: #5558
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T09:21:09.548Z
---

**What.** Two stopgap rows in the people-moves engine keep movers from leaving: a holder of a job a saved agreement names as its provider's qualification (SG-P15-moves-pinned-jobs), and a person whose income award is paid into a household others stay in (SG-FIXER-moves-income-household). The first row also says moves keeps its own copy of the jobs engine's lookup. That copy is gone: both engines now read one lookup in `src/core2/pinned-jobs.ts`. Letting these people actually move needs two changes in other engines, filed as their own items.

**Rules.** Replace, never layer: the duplicated lookup is deleted in the same change. Wire to the world: the movers leave only when the agreement and the award can follow them.

**Done when.** The shared lookup is the only copy (the jobs and moves tests pass in a drawn place), and the item is done when `world-agreements-re-resolve-worker` and `core-income-award-follows-person` are done and both stopgap rows are resolved. The test in src/core2/moves.test.ts shows a pinned-job holder and an award recipient leaving in a played world (buildBenchWorld) by record id.

**Files.** src/core2/pinned-jobs.ts, src/core2/modules/jobs.ts, src/core2/modules/moves.ts

**Notes.** The old pool body was the empty template; this is the real one. Split Oct 15: the duplicate copy is removed in this PR, the two row replacements are the blocked-on items.

Oct 20: Everything it waited on is done, so it is open.

Checked Oct 20 (claude/political-game-pool-3xfqef-22), nothing left to build. Both rows are `resolved` in `src/core2/data/stopgaps.json`: SG-P15-moves-pinned-jobs (resolved Oct 19 by `world-agreements-re-resolve-worker`, #5129: the moves engine's copy of the lookup is deleted and an agreement re-resolves its qualifying worker at its next payment, `finance-cash.ts` `productJobRelations`) and SG-FIXER-moves-income-household (resolved Oct 16 by `core-income-award-follows-person`: a mover's recipient income contract names the household where they live now, `moveRecipientIncomeHome`). `src/core2/pinned-jobs.ts` does not exist and `jobs.ts` has no pinned-job lookup any more, so there is no duplicate to delete. `src/core2/moves.test.ts` already holds the award case ("pays a mover's recorded income into the household where they live now"); it checks every live recipient income term against the person's household and, when a term has moved, that its recorded household differs, so a place where nobody with an award moved passes it with nothing to check. A pinned-job holder leaving has no test because pinning no longer exists to test. The CTO can close this item as done.

Released 2026-10-20 09:20Z by the CTO: claimed by claude/moves-pinned at 06:41Z, but that branch was never pushed and no PR opened (claims expire after 60 minutes). Findings so far are on PR #5558.

Oct 20 (fs11vb, CTO's two asks): (a) built as `src/core2/moves-award.test.ts`. It draws places from all 56 (up to six) in the played world, builds each award recipient's pull to where leaving wins, and calls the engine's own `reviewMove`; it asserts by record id that a recipient who moved into a household of their own is paid there (`recipientIncome.householdId` is the person's new household, `recordedHouseholdId` the saved one, `movedOn` the day) and fails with a reason per place when none moves. Passed on Lafayette, Tennessee (4740160), seed 1507dc06…, where 1 of 3 recipients moved (award `opening-retirement-income:e66f83300fe01b33`, person `person_2bef4d016d1f1190`). A recipient who moves with their whole household keeps the household, so the award needs no change; the test counts those apart. (b) a played-world fixture cannot be shown: 34 bench worlds from all 56 places hold no saved agreement that names a job, by either `placeMetadata` or `governmentFacts`. The re-resolve is covered where agreements can be built: `finance-supplied-customer-cash.test.ts` (both outcomes when a named job ends: settles through the worker hired into the occupation, or the agreement ends when no one does that work) and `agreement-jobs-free.test.ts` for a played year. A mover's job ends through `api.endJob`, the same call those tests use. Ready for the CTO to mark done.
