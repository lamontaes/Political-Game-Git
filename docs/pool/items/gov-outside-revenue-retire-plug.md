---
id: gov-outside-revenue-retire-plug
title: "Remove the monthly outside-revenue plug and its stopgap row"
area: gov
kind: stopgap
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
after: gov-outside-revenue-taxes,gov-outside-revenue-fees,gov-outside-revenue-aid,gov-outside-revenue-borrowing,gov-outside-spending-payees
source: "split from gov-outside-revenue-real-payers"
---

**What.** Once each revenue family is paid by its real payer and the spending leg by its payees, delete the monthly outside-revenue work (`closeTreasuries`' `outside-revenue:` transfer), the `outsideRevenue` table if nothing reads it, the stopgap rows SG-GOV-outside-revenue-monthly and SG-GOV-public-employers-outside, and the `plug` rows in `outside-flows.json`.

**Rules.** An effect is a read; the chain is the acceptance; one rule, all 56 places; no dice; estimate, never UNKNOWN; replace, never layer (the plug's share for this family goes in the same change).

**Done when.** `scripts/core2-year/closures.mjs` check 6 passes in a drawn place (no plug rows matched, none unmatched) and the stopgap rows are gone from `stopgaps.json`.

**Files.** src/core2/budgets-treasury.ts, src/core2/modules/budgets.ts, src/core2/data/stopgaps.json, src/core2/data/outside-flows.json

**Notes.** Replace, never layer: the plug is deleted, not left beside the new payers. Split from gov-outside-revenue-real-payers (Oct 15). The plug is `closeTreasuries` in `src/core2/budgets-treasury.ts` (the `outside-revenue:` transfer) and stopgap SG-GOV-outside-revenue-monthly.
