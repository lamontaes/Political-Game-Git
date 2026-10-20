---
id: world-census-scale-closures-rise
title: "A Census-size town's firms still close more than at the sample size: 114 closure rows in a year against none"
area: world
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/fs11vb-closures
pr: #5553
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T06:19:29.296Z
---

**What.** After outside demand was scaled by the count scale, a town opened at its Census size (Chantilly, Virginia) still shows 114 closure rows in the jobs engine in a played year, against none at the sample size. Closures remove the firm and its workers' jobs. Find why firms close at Census scale (their books, credit or owner draws read a figure that does not scale) and make the reads agree.

**Rules.** Wire to the world: every reader of a household or firm figure multiplies by the weight the same way. No dice: a firm closes from its books and its owner's choice, not a chance.

**Done when.** In a one-year played world (buildBenchWorld with countScale set to Census over 10,000, a drawn place above 10,000, seed named) the closure rows in the jobs engine's changes table are within the same town's count at scale one, named by job change id, shown by a case in src/core2/census-weight-economy.test.ts.

**Files.** src/core2/modules/business.ts, src/core2/modules/jobs.ts, src/core2/census-weight-economy.test.ts

**Notes.** TODO

Sent back 2026-10-20 from PR #5553 (branch claude/closures-rise): new Core test imports the old simulation population reader and impact:none mislabels gameplay changes to sales and owner payouts; use a Core-owned reader and a gameplay release declaration; finish on that branch, merge main into it first.
