---
id: gov-outside-revenue-fees-wiring
title: "Fees and charges are paid on the day of use by the households and businesses that use the service, by service"
area: gov
kind: wiring
priority: 1
size: M
status: open
claimed-by:
pr: #4629
blocked-on:
after: gov-outside-revenue-fees-data
source: added with npm run pool -- add
claimed-at:
---

**What.** Governments' charges and miscellaneous revenue (the fees line in the budget) are now paid by the households and businesses that use each service, on the day they use it, by service. Today `budgets-treasury.ts` fills that line from the outside account as a lump transfer each month (`outside-revenue`), so no resident or business pays it. Replace that part with payments from the users of each service, using the service and kind rows from the data item `gov-outside-revenue-fees-data`, and delete the lump transfer for the lines it covers.

**Rules.** Wire to the world: every fee moves a dollar from a named household or business to the government's account in a generated world. No dice: who pays and how much follows use, price and the fee schedule in force, never a roll. One model, two tiers: counted groups pay by the same rule as full people, times their count. Replace, never layer: the old outside lump goes away for these lines.

**Done when.** In a one-year `buildBenchWorld` run in a place drawn from all 56 (seed named in the PR), every charge on the fees line has a ledger entry from a named household or business to the government, `outsideRevenue` rows no longer carry that line, and the government's receipts for it equal the sum of those payments. The test in `src/core2/budgets-treasury` terms checks the match, and the owner plays it: open the town budget and see the fees line paid by named users of each service.

**Files.** src/core2/budgets-treasury.ts, src/core2/modules/budgets.ts, src/core2/modules/finance.ts, src/core2/data/budgets/treasury-spending.json.

**Notes.** Waits on gov-outside-revenue-fees-data (PR #4482).
