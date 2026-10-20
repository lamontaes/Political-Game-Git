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
claimed-at: 2026-10-20T01:57:45.171Z
---

**What.** An allocation profile of a played year in Discovery Harbour, Hawaii (seed m7a, 23 GB allocated) puts the cash journal's posting functions at about 14 percent of allocation: postCashJournal, projectCashJournal, volumes, portfolios and plusTotals. plusTotals and volumes build BigInt values for every posting and owner total only to check that a sum of whole minor amounts stays exact, which a safe-integer check on the plain sum does equally well.

**Rules.** Every dollar must still balance (the journal tests are the check); Speed: no change may make a year more than 20 percent slower, and a year in the dense town must come under two minutes.

**Done when.** A fresh allocation profile of npm run speed:year on seed m7a shows plusTotals and volumes together under half their 770 MB, and src/core2/journal*.test.ts and the accounts tests pass, shown in the PR body.

**Files.** src/core2/journal-state.ts

**Notes.** TODO
