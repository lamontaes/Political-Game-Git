---
id: gov-outside-spending-payees
title: "Treasury spending that leaves the town goes to real payees: contractors, public workers elsewhere, benefit recipients, bondholders"
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

**What.** The share of a treasury's spending line that leaves the town (`treasury-spending:outside`) goes to the outside account as spending elsewhere. Have it paid to real payees: public workers who live elsewhere (a payroll), contractors and suppliers, benefit recipients in other places, and holders of the government's debt, each a named counted group or business with a transfer on its real date.

**Rules.** An effect is a read; the chain is the acceptance; one rule, all 56 places; no dice; estimate, never UNKNOWN; replace, never layer (the plug's share for this family goes in the same change).

**Done when.** In a drawn place, a one-year run of the played world (`buildBenchWorld`), `scripts/core2-year/closures.mjs` check 6 matches no plug row for this family for the spending leg, each outside payment names a payee group and a date; no spending leg remains with only the outside account as payee.

**Files.** src/core2/budgets-treasury.ts, src/core2/data/budgets/treasury-spending.json (`providers`), src/core2/data/outside-flows.json

**Notes.** Registered as SG-GOV-public-employers-outside as well; retire both rows with this item. Split from gov-outside-revenue-real-payers (Oct 15). The plug is `closeTreasuries` in `src/core2/budgets-treasury.ts` (the `outside-revenue:` transfer) and stopgap SG-GOV-outside-revenue-monthly.
