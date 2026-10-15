---
id: gov-outside-rev-local-taxes
title: "City and county tax revenue paid by its payer groups on due dates"
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

**What.** Replace the monthly twelfth for the city and county tax lines (property, sales, selective sales, vehicle and other taxes) with transfers from the payer groups on the dates the law sets (property tax installments, sales tax remitted monthly). Delete the outside-revenue path for these lines.

**Rules.** An effect is a read; the chain is the acceptance; one rule, all 56 places; no dice; estimate, never UNKNOWN; replace, never layer (the plug path for this family is deleted in the same change).

**Done when.** Check 6 shows no `outside-revenue` rows for city and county tax lines in a played year in a drawn place; each tax receipt names its payer group and due date; the town's own taxpayers' payments are not double counted. "The owner plays it:" the town's treasury statement shows who paid each line.

**Files.** src/core2/budgets-treasury.ts, src/core2/modules/budgets.ts, src/core2/data/outside-flows.json

**Notes.** Parent: `gov-outside-revenue-real-payers` (L, split by the claiming session, Oct 15). The plug is the three transfer prefixes `outside-revenue`, `treasury` and `federal-borrowing` in `src/core2/data/outside-flows.json`; the closure check is `scripts/core2-year/closures.mjs` check 6.
