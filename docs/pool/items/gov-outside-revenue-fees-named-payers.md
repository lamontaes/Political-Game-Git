---
id: gov-outside-revenue-fees-named-payers
title: "A government's charges and fees are paid by named payers (the town's households and the government's other service users), none of it in the outside lump"
area: gov
kind: stopgap
priority: 2
size: M
status: in-pr
claimed-by:
pr: #5926
blocked-on:
source: added with npm run pool -- add
---

**What.** The payer step of gov-outside-revenue-fees. A treasury's charges and fees reached it as an even twelfth of Census revenue from the outside account with nobody paying them. Pay them instead from named payers: the town's households out of the living cost they pay on the 1st (budgets-service-charges.ts), and the government's service users elsewhere for the rest of the month's twelfth, less what the town's households paid, on a transfer classed as an exchange for services; delete the charges branch of the outside lump.

**Rules.** Wire to the world: every charge dollar moves a payer's money to a treasury on the journal. One model, two tiers: counted households pay by the same rule as full ones, times their count. Replace, never layer: the charges branch of the outside lump is deleted. Estimate, never UNKNOWN: the service users' line is ESTIMATED with its spread.

**Done when.** In a one-year run of the played world (buildBenchWorld, every module installed) in a place drawn from all 56 with a seed the builder did not choose (both named in the PR body): scripts/core2-year/closures.mjs check 6 classes the charges as goods-and-services, not plug; the treasury's charges revenue equals the sum of named payers' payments on the journal; a named household's charge is traced from its payer's cash to the treasury by journal receipt and transfer id; tests in src/core2/budgets-charges-payers.test.ts beside src/core2/budgets.test.ts.

**Files.** src/core2/budgets-treasury.ts,src/core2/budgets-service-charges.ts,src/core2/data/budgets/revenue-payers.json,src/core2/data/outside-flows.json,src/core2/budgets-charges-payers.test.ts

**Notes.** Split from gov-outside-revenue-fees on the merger's Oct 24 return of #5926: the payer step is done there. The parent keeps paying each charge on the day of use (gov-service-charges-by-use), a council bill setting a fee's level (gov-fee-level-by-bill) and the owner-plays-it line.
