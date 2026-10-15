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
source: "split from gov-outside-revenue-real-payers"
---

**What.** The revenue lines no flow in the town pays (corporate income tax, selective sales and excise taxes, vehicle and other taxes, customs duties, estate and gift taxes) are paid today by the monthly plug. Have them paid by real payers: the town's businesses and residents where the line falls on them, and named counted groups of non-residents (other places' businesses and households at the coarser level) for the rest, on each tax's due dates, each payment a ledger transfer from a payer's account.

**Rules.** An effect is a read; the chain is the acceptance; one rule, all 56 places; no dice; estimate, never UNKNOWN; replace, never layer (the plug's share for this family goes in the same change).

**Done when.** In a drawn place, a one-year run of the played world (`buildBenchWorld`), `scripts/core2-year/closures.mjs` check 6 matches no plug row for this family, each payment names a payer account and a due date, and the sum of payments over the year equals the budget line within the line's spread.

**Files.** src/core2/budgets-treasury.ts, src/core2/modules/budgets.ts, src/core2/data/outside-flows.json, src/core2/data/budgets/treasury-spending.json

**Notes.** The lines are `corporateIncomeTax`, `selectiveSalesTaxes`, `vehicleAndOtherTaxes` (state and local), `corporateIncomeTax`, `customsDuties`, `exciseTaxes`, `estateAndGiftTaxes` (federal). The in-town lines (individual income, payroll, general sales, property) are already paid by town flows. Split from gov-outside-revenue-real-payers (Oct 15). The plug is `closeTreasuries` in `src/core2/budgets-treasury.ts` (the `outside-revenue:` transfer) and stopgap SG-GOV-outside-revenue-monthly.
