---
id: gov-outside-rev-federal-taxes
title: "Federal tax revenue paid by its payer groups on due dates"
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

**What.** Same replacement for the federal treasury's receipts: individual income tax, payroll taxes, corporate income tax, customs duties, excise and estate and gift taxes, from payer groups (importers for customs, employers for payroll) on real dates.

**Rules.** An effect is a read; the chain is the acceptance; one rule, all 56 places; no dice; estimate, never UNKNOWN; replace, never layer (the plug path for this family is deleted in the same change).

**Done when.** Check 6 shows no `outside-revenue` rows for federal receipt lines; receipts name payer and date; the federal total stays within the Monthly Treasury Statement line's spread. "The owner plays it:" the town's treasury statement shows who paid each line.

**Files.** src/core2/budgets-treasury.ts, src/core2/data/budgets/, src/core2/data/outside-flows.json

**Notes.** Parent: `gov-outside-revenue-real-payers` (L, split by the claiming session, Oct 15). The plug is the three transfer prefixes `outside-revenue`, `treasury` and `federal-borrowing` in `src/core2/data/outside-flows.json`; the closure check is `scripts/core2-year/closures.mjs` check 6.
