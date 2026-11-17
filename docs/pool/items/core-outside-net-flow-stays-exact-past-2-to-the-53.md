---
id: core-outside-net-flow-stays-exact-past-2-to-the-53
title: "An outside owner's signed net flow stays exact once it passes 2^53 cents, so a long game does not stop in year 12 or 13"
area: core
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: long-game
pr:
after:
blocked-on:
root: none
lead: speed
standard: 2
model: sonnet
effort: medium
source: the nightly 20-year run on main, Actions run 44067120033, Nov 17
---

**What.** The long game stops in its twelfth or thirteenth year when an outside owner's signed net flow, kept as a plain number of cents, passes 2^53 and the journal refuses it. The federal treasury's outside side pays out about 573 billion dollars a month, so any save reaches the limit. The net flow stays exact once it passes the limit, and the journal reads it as before. Seen: the nightly 20-year run on main plays past year 13 in a drawn place.

**Cause.** Measured: at East Altoona, Pennsylvania (4220752), world seed fad48829853af7e91ada7acdf13195b60a07aaf6e393efccb9a234c822ba8d68, by `npm run long-game -- --place 4220752 --world-seed fad48829853af7e91ada7acdf13195b60a07aaf6e393efccb9a234c822ba8d68 --years 12` (Actions run 44067120033 on main), the run crashes on 2036-12-01 with "Journal signed flow overflows exact minor units: outside net flow" from `journalExactSignedMinor` in `src/core2/journal.ts`. An earlier run at Ranger, Georgia (1363560, world seed d411cb3b087ea50d7c71a763b8434a27ca232b93aa234b5ea70f77a5a90682a6) stopped the same way in year 13.

**Fix.** Keep the signed net flow a number while it is a safe integer and an exact bigint once it passes 2^53 either way (`CashJournalSignedLifetimeMinor` in `src/core2/journal.ts`), read by `src/core2/journal-state.ts` and `src/core2/finance-plan.ts`; delete `journalExactSignedMinor`. Built on branch `claude/long-game-outside-net-overflow` (a51c4e8e).

**Time box.** 1 hour for a Sonnet session. When it runs out, push what passes and stop.

**Rules.** Ask why: the net flow is the sum of the journal's own postings, never a fitted value. One rule, all 56 places: nothing names a place.

**Done when.** A second session runs the 20-year long game in a drawn place (East Altoona, Pennsylvania, seed fad48829853af7e91ada7acdf13195b60a07aaf6e393efccb9a234c822ba8d68 is the one that crashed) and sees it play past year 13 with no journal overflow, and `src/core2/journal-state.test.ts` and `src/core2/journal.test.ts` pass.

**Waits on.** Nothing.

**Files.** src/core2/journal.ts, src/core2/journal-state.ts, src/core2/finance-plan.ts

**Notes.** Nov 17 (Long game): with this branch and Budgets' federal spending change the 20-year run at Ranger, Georgia passed (run 44058798653).
