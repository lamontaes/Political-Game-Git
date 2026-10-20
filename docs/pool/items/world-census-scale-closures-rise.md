---
id: world-census-scale-closures-rise
title: "A Census-size town's firms still close more than at the sample size: 114 closure rows in a year against none"
area: world
kind: bug
priority: 2
size: S
status: claimed
claimed-by: claude/census-closures
pr: #5553
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T12:41:22.232Z
---

**What.** After outside demand was scaled by the count scale, a town opened at its Census size (Chantilly, Virginia) still shows 114 closure rows in the jobs engine in a played year, against none at the sample size. Closures remove the firm and its workers' jobs. Find why firms close at Census scale (their books, credit or owner draws read a figure that does not scale) and make the reads agree.

**Rules.** Wire to the world: every reader of a household or firm figure multiplies by the weight the same way. No dice: a firm closes from its books and its owner's choice, not a chance.

**Done when.** In a one-year played world (buildBenchWorld with countScale set to Census over 10,000, a drawn place above 10,000, seed named) the closure rows in the jobs engine's changes table are within the same town's count at scale one, named by job change id, shown by a case in src/core2/census-weight-economy.test.ts.

**Files.** src/core2/modules/business.ts, src/core2/modules/jobs.ts, src/core2/census-weight-economy.test.ts

Sent back 2026-10-20 from PR #5553 (branch claude/closures-rise): new Core test imports the old simulation population reader and impact:none mislabels gameplay changes to sales and owner payouts; use a Core-owned reader and a gameplay release declaration; finish on that branch, merge main into it first.

**Notes.** Measured Oct 20 (claude, claude/fs11vb-census-closures) on main, Chantilly, Virginia (place 5114744), seed `closures-a`, `buildBenchWorld` with `twoLevel` and `countScale`, one year from the game start, closure rows counted in the jobs engine's changes table and firms from `core.finance.businesses`:

| scale | outside demand                                          | firms closed                                   | closure rows |
| ----- | ------------------------------------------------------- | ---------------------------------------------- | ------------ |
| 1     | 1                                                       | 0 of 28                                        | 0            |
| 8     | 1                                                       | 20 of 28 (28 open at the start, 12 at the end) | 765          |
| 4     | 1                                                       | 16                                             | 683          |
| 4     | 4 (the largest `settings.economy.outsideDemand` allows) | 6                                              | 206          |

Every closure carries the reason `finance.unfunded-obligation-cash-and-credit-exhausted` (two at scale 8 are `losses-kept`), and the unpaid obligation is the counted workers' payroll (`residents:wages:opening-payroll-calendar:<employer>` on its February paydays, or a later `work-payroll`). So: (1) counted payroll is multiplied by the weight but the outside sales that fund much of it are not (`scaleOutsideSales` takes only the world setting, not the count scale), and scaling them by the count scale removes most closures; (2) six small local firms (an insurance agency, two restaurants, a salon, a bowling alley, a TV station) still run out of cash between May and January at scale 4 even with outside demand scaled, which is the shape of `world-local-sales-below-opening-forecast`; and (3) the opening cash buffers were not checked against the weighted payroll. The Done-when names `src/core2/census-weight-economy.test.ts`, which is not on main; it belongs to the in-flight Census-weight PRs (#5373, #5306), so this item should be built after they merge.

Sent back 2026-10-20 from PR #5553 (branch claude/closures-rise): its own census-scale closures test fails in Central Falls, Rhode Island (3 closures at Census size, none at sample size); finish on that branch, merge main into it first.
