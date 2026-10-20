---
id: core-moves-pinned-and-income-stopgaps
title: "Movers with a pinned job or a household income award can leave (two stopgap rows in moves)"
area: core
kind: stopgap
priority: 2
size: M
status: claimed
claimed-by: claude/moves-pinned
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T06:41:27.526Z
---

**What.** Two stopgap rows in the people-moves engine keep movers from leaving: a holder of a job a saved agreement names as its provider's qualification (SG-P15-moves-pinned-jobs), and a person whose income award is paid into a household others stay in (SG-FIXER-moves-income-household). The first row also says moves keeps its own copy of the jobs engine's lookup. That copy is gone: both engines now read one lookup in `src/core2/pinned-jobs.ts`. Letting these people actually move needs two changes in other engines, filed as their own items.

**Rules.** Replace, never layer: the duplicated lookup is deleted in the same change. Wire to the world: the movers leave only when the agreement and the award can follow them.

**Done when.** The shared lookup is the only copy (the jobs and moves tests pass in a drawn place), and the item is done when `world-agreements-re-resolve-worker` and `core-income-award-follows-person` are done and both stopgap rows are resolved. The test in src/core2/moves.test.ts shows a pinned-job holder and an award recipient leaving in a played world (buildBenchWorld) by record id.

**Files.** src/core2/pinned-jobs.ts, src/core2/modules/jobs.ts, src/core2/modules/moves.ts

**Notes.** The old pool body was the empty template; this is the real one. Split Oct 15: the duplicate copy is removed in this PR, the two row replacements are the blocked-on items.

Oct 20: Everything it waited on is done, so it is open.

Checked Oct 20 (claude/political-game-pool-3xfqef-22), nothing left to build. Both rows are `resolved` in `src/core2/data/stopgaps.json`: SG-P15-moves-pinned-jobs (resolved Oct 19 by `world-agreements-re-resolve-worker`, #5129: the moves engine's copy of the lookup is deleted and an agreement re-resolves its qualifying worker at its next payment, `finance-cash.ts` `productJobRelations`) and SG-FIXER-moves-income-household (resolved Oct 16 by `core-income-award-follows-person`: a mover's recipient income contract names the household where they live now, `moveRecipientIncomeHome`). `src/core2/pinned-jobs.ts` does not exist and `jobs.ts` has no pinned-job lookup any more, so there is no duplicate to delete. `src/core2/moves.test.ts` already holds the award case ("pays a mover's recorded income into the household where they live now"); it checks every live recipient income term against the person's household and, when a term has moved, that its recorded household differs, so a place where nobody with an award moved passes it with nothing to check. A pinned-job holder leaving has no test because pinning no longer exists to test. The CTO can close this item as done.

Checked Oct 20 (claude/political-game-pool-b6g0dl) against main: nothing is left to build. Both rows are already `resolved` in src/core2/data/stopgaps.json: SG-P15-moves-pinned-jobs (resolution Oct 19: moves' copy of the lookup deleted; the agreement re-resolves at its next payment in finance-cash.ts `productJobRelations`; the dependency world-agreements-re-resolve-worker is done, #5129) and SG-FIXER-moves-income-household (resolved Oct 16: `moveRecipientIncomeHome` in finance-state.ts, called from moves.ts line 734; core-income-award-follows-person is dropped because that change landed under it). `src/core2/pinned-jobs.ts` named in the text does not exist; there is no second copy of the lookup anywhere (grep for "pinned" in src/core2/modules finds none). The award half has a test (moves.test.ts "pays a mover's recorded income into the household where they live now"); agreement-jobs-free.test.ts runs a year with named jobs free to end. The only unmet words of the done-when line are a test that shows a pinned-job holder leaving: moves.test.ts builds its world with economy off, so it has no agreements, and a played-world year rarely moves a holder of a named job (a handful of jobs in a town). The CTO can close this item as done on its stopgap rows.
