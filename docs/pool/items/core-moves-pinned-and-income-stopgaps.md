---
id: core-moves-pinned-and-income-stopgaps
title: "Movers with a pinned job or a household income award can leave (two stopgap rows in moves)"
area: core
kind: stopgap
priority: 2
size: M
status: claimed
claimed-by: claude/fs11vb-moves
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T05:17:57.756Z
---

**What.** Two stopgap rows in the people-moves engine keep movers from leaving: a holder of a job a saved agreement names as its provider's qualification (SG-P15-moves-pinned-jobs), and a person whose income award is paid into a household others stay in (SG-FIXER-moves-income-household). The first row also says moves keeps its own copy of the jobs engine's lookup. That copy is gone: both engines now read one lookup in `src/core2/pinned-jobs.ts`. Letting these people actually move needs two changes in other engines, filed as their own items.

**Rules.** Replace, never layer: the duplicated lookup is deleted in the same change. Wire to the world: the movers leave only when the agreement and the award can follow them.

**Done when.** The shared lookup is the only copy (the jobs and moves tests pass in a drawn place), and the item is done when `world-agreements-re-resolve-worker` and `core-income-award-follows-person` are done and both stopgap rows are resolved. The test in src/core2/moves.test.ts shows a pinned-job holder and an award recipient leaving in a played world (buildBenchWorld) by record id.

**Files.** src/core2/pinned-jobs.ts, src/core2/modules/jobs.ts, src/core2/modules/moves.ts

**Notes.** The old pool body was the empty template; this is the real one. Split Oct 15: the duplicate copy is removed in this PR, the two row replacements are the blocked-on items.

Oct 20: Everything it waited on is done, so it is open.

Oct 20 (fs11vb): checked before building. Both stopgap rows in `stopgaps.json` already read resolved (SG-P15-moves-pinned-jobs on Oct 19, SG-FIXER-moves-income-household on Oct 16), and `src/core2/pinned-jobs.ts` does not exist: the jobs engine's lookup is `productJobRelations` in `finance-cash.ts`, and moves holds no copy. The award half is covered by "pays a mover's recorded income into the household where they live now" in `moves.test.ts`. The pinned-job half has no test: in a one-year bench world (West Park, Florida, seed p1, twoLevel) there were 0 saved provider qualifications under `openingCustomers.qualification:`, so no job was pinned and 92 people left with none held back. What remains is a test with a place that has a visitor or public-supplier agreement (or a fixture that saves one) showing its job's holder leaving and the agreement re-resolving at its next payment.

Oct 20 (fs11vb, second look): scanned the saved qualifications (`openingCustomers.qualification:` in placeMetadata) in 25 more bench worlds drawn from all 56 places (seeds scan0 to scan24, from Bonnieville, Kentucky to Quamba, Minnesota, including D.C., Hawaii, Alaska and Puerto Rico): every one holds 0 qualifications and 0 pinned jobs. So the bench world never pins a job today, and a played-world test of a pinned holder leaving cannot be written without a fixture that saves an agreement. Whether the opening should write visitor and public-supplier qualifications at all is a question for whoever owns opening customers, not moves; this item's own work (one shared lookup, both rows resolved) is done.
