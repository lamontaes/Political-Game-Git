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

Oct 20 (claude, claude/closures-rise, after merging main): two more causes found and fixed, one case still failing. (1) Firms put cash into bank deposits above a reserve that counted only the book's unweighted payroll (`credit-deposits.ts`), and a payment that fell short never drew on those deposits, so a firm closed holding money in the bank (Central Falls, Rhode Island: 9.5 million minor units on deposit at the closure). The reserve now reads `weightedPayrollMinor` (new in `residents-economy.ts`, replacing the inline sum in `business.ts`) and a business pays from its savings first (`spendableFromSavings` in `modules/residents.ts`). Central Falls, seed `cf-seed-1`, census scale 2.3124: 2 closures before, 1 after, against 1 at the sample size. (2) Opelika, Alabama (0157048, seed 628a8831…, scale 3.5765) still closes 3 firms against 0 at the sample size, none holding any deposits (a campaign firm 2025-09-29, a bowling alley 2025-12-18, a communications firm 2026-01-14), each with a few million in cash the day before a payroll that is larger. Tried and ruled out: no owner draws at all (3 closures), a cushion that also covers other costs (4), scaling each book's demand and capacity by the count scale (8, worse). Not yet tried: the seller-capacity cap in `overCapacity` (`modules/residents.ts`), which sends spending beyond `annualDemandMinor` / utilization elsewhere, so a firm's counted sales cannot grow with its weighted payroll. The test in `census-scale-closures.test.ts` therefore still fails on that draw; do not loosen it.

Oct 20 (claude, later): the seller-capacity cap was the next cause and is now fixed in part. `overCapacity` (`modules/residents.ts`) sent counted spending beyond the book's `annualDemandMinor` / utilization to the outside market, so a seller staffed by counted workers (payroll weighted 2 to 4 times) could not take in more than the sample-size town did. Capacity now scales by the seller's weighted payroll over its book payroll (`weightedPayrollMinor`). Opelika, Alabama, scale 3.5765: 3 closures before, 2 after (a campaign firm and a communications firm, both thin margins: payroll, demand and other costs 26M, 93M, 61M and 117M, 1,073M, 880M a year); Central Falls stays at 1 against the sample's 1. The 2 still fail the item's test on that draw. Next: those firms' other costs are `outside-costs` flows and cost contracts that do not scale with the weighted payroll the way their sales now do; compare their costs at both scales with the journal trace (`setJournalTrace`, group postings by `sourceRef.id`).

Oct 20 (claude, journal trace of Opelika Campaign Works, a firm that closes 2025-09-29 at scale 3.5765 and survives the year at scale 1): both runs lose money. Through 2025-09-28 at scale 1 it took in 32.7M minor units (all outside sales) and paid out 36.5M (outside costs 18.2M, wages 16.9M, employer tax 1.4M, owner draw 0.08M) from 5.0M opening cash; at scale 3.5765 it took in 117.0M and paid out 133.3M (outside costs 65.2M, wages 62.1M, tax 5.0M, owner draw 1.0M) from 17.9M. Net loss over opening cash is the same 0.9 to 0.98 both ways, so the firm is on a path to close either way and the scale only moves the date by weeks (wages scale 3.68 against cash 3.58, and the owner draw is 12 times larger). The closures are therefore not a scaling bug: the opening hands some firms a forecast their sales do not meet (`world-local-sales-below-opening-forecast`). The test criterion (Census-size closures no more than the sample size on one draw) is a knife edge for such firms. Options for the CTO: compare the closures of firms that make money at the sample size, or finish the forecast item first. No loosening in this PR.
