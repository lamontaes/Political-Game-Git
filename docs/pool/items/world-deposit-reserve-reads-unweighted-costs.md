---
id: world-deposit-reserve-reads-unweighted-costs
title: "A business's deposit reserve reads its other costs at the sample size while its sales run at the town's weight"
area: world
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr: #5791
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** In src/core2/credit-deposits.ts the deposit reserve a business keeps in cash is figured from the book's annualOtherCostsMinor, which is not multiplied by the town's count weight, while its sales and purchases are. In Opelika, Alabama (0157048, seed op1, scale 3.5765) a wholesaler put 6.43 billion minor units in the bank, 8.2 times the sample's deposits for 3.55 times the flows, and held no cash on its payday. Read the weighted costs the way the other readers of a business's book do.

**Rules.** One model, two tiers: every reader of a business figure multiplies by the weight the same way. Wire to the world: the deposits and the cash on hand move on the journal, shown in a played year.

**Done when.** In a one-year played world built with buildBenchWorld at Census scale in a drawn place above 10,000 (seed named), each business's deposits divided by its weighted flows are within a stated spread of the same town's ratio at the sample size, named by organization id, in a test in src/core2.

**Files.** src/core2/credit-deposits.ts

**Notes.** Found by the helper working world-census-scale-closures-rise (PR #5553); closures no longer follow from it since payroll draws savings.

Measured Oct 21 (claude, claude/deposit-reserve), tried and reverted. Opelika, Alabama (0157048, seed op1), 120 days, default size against countScale 3.5765, 37 businesses either way (38 with a newspaper added at scale). Before any change: received 13.68 bn at the default size and 46.31 bn at scale (3.38 times); deposits 574 million and 6,381 million (11.1 times, which is the item's finding); business cash 7.54 bn and 9.72 bn (1.3 times); booked payroll and other costs unchanged (5.13 bn and 40.9 bn a year). The books are the sample's while sales run at the weight, as the item says. Tried: reserve from the larger of the booked other costs and the booked cost share (other costs over demand) of the sales received per month since the game began. Result: deposits 533 million at the default size (about 7.1 percent lower) and 55 million at scale (0.1 times the default, for 3.4 times the flows); business cash rose to 16.0 bn, because the reserve now takes 3.4 times the costs while cash is only 2 times: the firms' cash is the sample's opening stock, not weighted. So the deposit ratio lands about 33 times too low instead of 3 times too high, for this tested reserve formula; it does not establish that every reserve rule over that cash must fail. This historical snapshot predates the weighted-opening-cash work merged with #5553. Recheck the current cash, capital and cost readers before choosing the next correction (world-census-scaled-establishments-short and world-census-weight-economy track the sizing). The change is reverted; this item's Done when stays open.

Sent back 2026-10-23 from PR #5791 (branch claude/deposit-reserve-weighted): The table substitutes 120 days and a town aggregate for the required year and per-business ratio bounds, and the diff has no release declaration; supply the actual acceptance or track a bounded slice; finish on that branch, merge main into it first.
