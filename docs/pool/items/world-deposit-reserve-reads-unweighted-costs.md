---
id: world-deposit-reserve-reads-unweighted-costs
title: "A business's deposit reserve reads its other costs at the sample size while its sales run at the town's weight"
area: world
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** In src/core2/credit-deposits.ts the deposit reserve a business keeps in cash is figured from the book's annualOtherCostsMinor, which is not multiplied by the town's count weight, while its sales and purchases are. In Opelika, Alabama (0157048, seed op1, scale 3.5765) a wholesaler put 6.43 billion minor units in the bank, 8.2 times the sample's deposits for 3.55 times the flows, and held no cash on its payday. Read the weighted costs the way the other readers of a business's book do.

**Rules.** One model, two tiers: every reader of a business figure multiplies by the weight the same way. Wire to the world: the deposits and the cash on hand move on the journal, shown in a played year.

**Done when.** In a one-year played world built with buildBenchWorld at Census scale in a drawn place above 10,000 (seed named), each business's deposits divided by its weighted flows are within a stated spread of the same town's ratio at the sample size, named by organization id, in a test in src/core2.

**Files.** src/core2/credit-deposits.ts

**Notes.** Found by the helper working world-census-scale-closures-rise (PR #5553); closures no longer follow from it since payroll draws savings.
