---
id: core-speed-journal-bigint
title: "The cash journal adds its totals in plain numbers, checked exact, not as BigInt for every posting"
area: core
kind: bug
priority: 2
size: S
status: claimed
claimed-by: claude/speed-journal-bigint
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T02:21:21.934Z
---

**What.** An allocation profile of a played year in Discovery Harbour, Hawaii (seed m7a, 23 GB allocated) puts the cash journal's posting functions at about 14 percent of allocation: postCashJournal, projectCashJournal, volumes, portfolios and plusTotals. plusTotals and volumes build BigInt values for every posting and owner total only to check that a sum of whole minor amounts stays exact, which a safe-integer check on the plain sum does equally well. A later CPU profile shows this is not worth doing (see the notes).

**Rules.** Every dollar must still balance (the journal tests are the check); Speed: no change may make a year more than 20 percent slower, and a year in the dense town must come under two minutes.

**Done when.** A fresh allocation profile of npm run speed:year on seed m7a shows plusTotals and volumes together under half their 770 MB, and src/core2/journal*.test.ts and the accounts tests pass, shown in the PR body.

**Files.** src/core2/journal-state.ts

**Notes.** TODO

Tried Oct 20 (claude, branch claude/speed-journal-bigint, not proposed for merge): plusTotals, volumes and the outside-flow totals in `journal-state.ts` rewritten to add plain safe integers and refuse a sum that is not a safe integer (same exactness guarantee, no BigInt). The journal, accounts and finance tests passed (16 files, 568 tests). Same-session timing on seed m7a, two runs each, one process at a time: branch 36.2 s and 36.8 s, main 35.7 s and 35.9 s. No gain, so it should not merge. The allocation profile (23 GB) charged these functions about 770 MB, but V8 reclaims short-lived BigInts cheaply and the year did not move, so the journal's cost is not in its number type. Next look: the per-posting receipt objects and `sourceRef` copies in `postCashJournal` (1.1 GB) and the account snapshot maps built by `portfolios` (0.4 GB), measured by an A/B run like this one before any PR.

Profiled Oct 20 (claude/political-game-pool-8defjq): a CPU profile (`node --cpu-prof`, `npm run speed:year -- --seed m7a`, Discovery Harbour, Hawaii, 4-core container, year 1 in 45.6 s, 62.9 s of samples) puts all of `journal-state.ts` at 3.15 s of self time, 5 percent, with `postCashJournal` 1.32 s, `portfolios` 0.51 s and `projectCashJournal` (journal.ts) 0.89 s. So even removing every BigInt and receipt copy could save about 2 percent of a year, well inside run-to-run noise, which matches the earlier A/B (36.2 s against 35.7 s). The allocation profile misled: it counts bytes, and V8 reclaims short-lived BigInts cheaply. The journal is not where the year goes. The largest self times are the garbage collector (16.5 percent), `monthBoundary` in work-pay-period.ts (1.64 s, 2.6 percent), `releaseResidentHousehold` (1.00 s), `makeIsoDate` (0.90 s) and `epochDayOf` (0.41 s) in kernel/dates.ts, `onHoliday` in school.ts (0.64 s) and `recordWorkAttendance` (0.53 s). Recommend the CTO drops this item and that the dense-town speed item (core-speed-year-over-limit-dense-town) starts from those functions.
