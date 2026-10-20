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

**What.** An allocation profile of a played year in Discovery Harbour, Hawaii (seed m7a, 23 GB allocated) puts the cash journal's posting functions at about 14 percent of allocation: postCashJournal, projectCashJournal, volumes, portfolios and plusTotals. plusTotals and volumes build BigInt values for every posting and owner total only to check that a sum of whole minor amounts stays exact, which a safe-integer check on the plain sum does equally well.

**Rules.** Every dollar must still balance (the journal tests are the check); Speed: no change may make a year more than 20 percent slower, and a year in the dense town must come under two minutes.

**Done when.** A fresh allocation profile of npm run speed:year on seed m7a shows plusTotals and volumes together under half their 770 MB, and src/core2/journal*.test.ts and the accounts tests pass, shown in the PR body.

**Files.** src/core2/journal-state.ts

**Notes.** TODO

Tried Oct 20 (claude, branch claude/speed-journal-bigint, not proposed for merge): plusTotals, volumes and the outside-flow totals in `journal-state.ts` rewritten to add plain safe integers and refuse a sum that is not a safe integer (same exactness guarantee, no BigInt). The journal, accounts and finance tests passed (16 files, 568 tests). Same-session timing on seed m7a, two runs each, one process at a time: branch 36.2 s and 36.8 s, main 35.7 s and 35.9 s. No gain, so it should not merge. The allocation profile (23 GB) charged these functions about 770 MB, but V8 reclaims short-lived BigInts cheaply and the year did not move, so the journal's cost is not in its number type. Next look: the per-posting receipt objects and `sourceRef` copies in `postCashJournal` (1.1 GB) and the account snapshot maps built by `portfolios` (0.4 GB), measured by an A/B run like this one before any PR.
