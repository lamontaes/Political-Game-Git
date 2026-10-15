---
id: gov-outside-revenue-fees
title: "Charges, fees and miscellaneous revenue are paid by the people and businesses that use the service"
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

**What.** `chargesAndFees` and `miscellaneous` revenue arrive from the plug. Have them paid when a person or business uses the service (a permit, a fine, a park or hospital charge, a utility): a ledger transfer from the payer to the treasury on the day of use, with the service named, and the share used by non-residents paid by a named counted group.

**Rules.** An effect is a read; the chain is the acceptance; one rule, all 56 places; no dice; estimate, never UNKNOWN; replace, never layer (the plug's share for this family goes in the same change).

**Done when.** In a drawn place, a one-year run of the played world (`buildBenchWorld`), `scripts/core2-year/closures.mjs` check 6 matches no plug row for this family, a payment names its payer and the service; the year's sum equals the budget line within spread.

**Files.** src/core2/budgets-treasury.ts, src/core2/modules/budgets.ts, the engines that provide the services

**Notes.** Several services already charge (court fines, permit fees, utility bills); read their journals before adding a payer. Split from gov-outside-revenue-real-payers (Oct 15). The plug is `closeTreasuries` in `src/core2/budgets-treasury.ts` (the `outside-revenue:` transfer) and stopgap SG-GOV-outside-revenue-monthly.
