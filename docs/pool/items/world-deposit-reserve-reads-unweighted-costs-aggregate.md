---
id: world-deposit-reserve-reads-unweighted-costs-aggregate
title: "A Census-size town banks about the sample size's share of its flows once the deposit reserve reads every cost at the town's weight"
area: world
kind: bug
priority: 2
size: S
status: done
claimed-by:
pr: #5791
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** A bounded part of `world-deposit-reserve-reads-unweighted-costs`: the deposit reserve in src/core2/credit-deposits.ts reads a business's payroll and its other costs times one staffed scale (the payroll with its counted workers at their weight over the book's payroll), the same scale the seller-capacity cap reads, so a town opened at its Census size puts about as much of its flows in the bank as the same town at the sample size. A single firm's deposits on a given day are whatever sat above its reserve at the last monthly sweep, so per-business ratios swing either way and are not claimed here.

**Rules.** One model, two tiers: every reader of a business figure multiplies by the weight the same way. Wire to the world: the deposits and the cash on hand move on the journal, shown in a played world.

**Done when.** In a world built with buildBenchWorld and played 120 days at the sample size and at Census scale, in Opelika, Alabama (0157048, seed op1) and in a place drawn from all 56 above 10,000 people (seed named), the town's deposits per weighted flow at Census scale are within a factor of two either way of the same town's ratio at the sample size, with the three largest banks' own ratios printed by organization id, in src/core2/deposit-reserve-weighted.test.ts. **On screen.** Nothing yet.

**Files.** src/core2/credit-deposits.ts, src/core2/residents-economy.ts, src/core2/deposit-reserve-weighted.test.ts

**Notes.** Fixer, Oct 27: split from the original item after Merger 1's send-back of PR #5791. The per-business, one-year proof stays in `world-deposit-reserve-reads-unweighted-costs`.
