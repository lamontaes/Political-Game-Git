---
id: gov-outside-spend-payees
title: "Treasury spending paid to real payees: public workers, contractors, benefit recipients"
area: gov
kind: stopgap
priority: 1
size: M
status: open
claimed-by:
pr:
after: gov-outside-rev-payer-model
blocked-on:
milestone:
source: "split from gov-outside-revenue-real-payers; stopgap SG-GOV-outside-revenue-monthly"
---

**What.** Replace the monthly treasury spending to the outside account (`treasury` prefix) with payments to real payees: public workers outside the town on their paydays, contractors for purchased shares, and benefit recipients, each as a counted group. In-town payees already paid stay as they are.

**Rules.** An effect is a read; the chain is the acceptance; one rule, all 56 places; no dice; estimate, never UNKNOWN; replace, never layer (the plug path for this family is deleted in the same change).

**Done when.** Check 6 shows no `treasury` plug rows; each spending line names its payee group and payday; the line totals stay equal to the adopted budget. "The owner plays it:" the town's treasury statement shows who paid each line.

**Files.** src/core2/budgets-treasury.ts, src/core2/data/budgets/treasury-spending.json, src/core2/data/outside-flows.json

**Notes.** Parent: `gov-outside-revenue-real-payers` (L, split by the claiming session, Oct 15). The plug is the three transfer prefixes `outside-revenue`, `treasury` and `federal-borrowing` in `src/core2/data/outside-flows.json`; the closure check is `scripts/core2-year/closures.mjs` check 6.
