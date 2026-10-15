---
id: gov-outside-revenue-taxes
title: "Taxes the town's flows do not pay (corporate, excise, vehicle, customs, estate) come from real payers"
area: gov
kind: stopgap
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Corporate income, excise, vehicle, customs and estate taxes that the town's own flows do not pay still reach the treasuries as the monthly plug from the outside account. Give each a real payer: corporate tax on the profit in the businesses' books, excise tax on the fuel, tobacco and alcohol purchases that `src/core2/modules/purchase-tax.ts` already prices, vehicle fees on the households that own vehicles, customs duty on goods bought from outside sellers, and the estate tax on estates that settle (see estates-proof). The player would notice that a tax law passed in council or Congress changes what named businesses and households pay, not just a budget number.

**Rules.** The chain is the acceptance: follow one corporate tax dollar from a named business's books and one excise dollar from a named buyer to the treasury and onward to a spending line; An effect is a read, not a record: each payer reads the rate in force from `lawInForce` at the moment it pays; One model, two tiers: counted businesses and households pay by the same rule as full ones times their count; No dice: profit, purchases and the law decide who pays what, never a roll; One rule, all 56 places: rates are law data for all 56 places, with no place named in code; Research before building: real collections check the totals and never decide one payer's amount; Estimate, never UNKNOWN: a rate with no source starts from the real average marked ESTIMATED with spread; Replace, never layer: the taxes share of the plug is deleted in the same change; Speed: taxes settle on filing and purchase days, with no new world scan.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): `scripts/core2-year/closures.mjs` check 6 shows the taxes family unmatched at zero, and the PR body names the record ids of one corporate payer, one excise buyer and one estate, each traced to a treasury journal entry. Tests beside `src/core2/budgets.test.ts` cover each tax family. The owner plays it: raises a tax in a bill and later reads in the news and the budget who paid more.

**Files.** src/core2/modules/budgets.ts, src/core2/modules/purchase-tax.ts, src/core2/modules/employer-taxes.ts, src/core2/modules/business.ts, src/core2/data/outside-flows.json, src/core2/data/stopgaps.json

**Notes.** Rewritten to the quality gate 2026-10-15 (the item was a stub when added with `npm run pool -- add`).
