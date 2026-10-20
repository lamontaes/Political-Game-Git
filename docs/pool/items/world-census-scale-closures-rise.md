---
id: world-census-scale-closures-rise
title: "A Census-size town's firms still close more than at the sample size: 114 closure rows in a year against none"
area: world
kind: bug
priority: 2
size: S
status: claimed
claimed-by: claude/fs11vb-census-closures
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T03:39:23.416Z
---

**What.** After outside demand was scaled by the count scale, a town opened at its Census size (Chantilly, Virginia) still shows 114 closure rows in the jobs engine in a played year, against none at the sample size. Closures remove the firm and its workers' jobs. Find why firms close at Census scale (their books, credit or owner draws read a figure that does not scale) and make the reads agree.

**Rules.** Wire to the world: every reader of a household or firm figure multiplies by the weight the same way. No dice: a firm closes from its books and its owner's choice, not a chance.

**Done when.** In a one-year played world (buildBenchWorld with countScale set to Census over 10,000, a drawn place above 10,000, seed named) the closure rows in the jobs engine's changes table are within the same town's count at scale one, named by job change id, shown by a case in src/core2/census-weight-economy.test.ts.

**Files.** src/core2/modules/business.ts, src/core2/modules/jobs.ts, src/core2/census-weight-economy.test.ts

**Notes.** TODO

Re-measured Oct 20 (claude, claude/political-game-pool-yucp92-ee) on the branch with the outside-demand fix, same town and seed, 365 played days: at scale one 0 closure rows and 481 quits, 65 layoffs, 529 hires; at Census scale 1 closure row (one television station, WUGR-TV, reason employer-closed), 724 quits, 69 layoffs, 933 hires. The 114 closure rows I reported earlier came from a run that set the outside demand through the world settings instead of the bench's own scaling, so they are not the state of the branch. The Census-scale closures now match scale one to within one firm; this item can close on the fix's merge unless the other session measures otherwise.
