---
id: gov-outside-rev-fees-misc
title: "Charges, fees and miscellaneous revenue paid by the people and businesses who use the service"
area: gov
kind: stopgap
priority: 1
size: S
status: open
claimed-by:
pr:
after: gov-outside-rev-payer-model
blocked-on:
milestone:
source: "split from gov-outside-revenue-real-payers; stopgap SG-GOV-outside-revenue-monthly"
---

**What.** Charges and fees and miscellaneous revenue (all levels) are paid by the users of the service: fee payers in the payer groups, tied to the spending line that provides the service (a water bill to the water line, tuition to the school line), not an even twelfth from outside.

**Rules.** An effect is a read; the chain is the acceptance; one rule, all 56 places; no dice; estimate, never UNKNOWN; replace, never layer (the plug path for this family is deleted in the same change).

**Done when.** Check 6 shows no `outside-revenue` rows for chargesAndFees or miscellaneous; each receipt names the paying group and the service line. "The owner plays it:" the town's treasury statement shows who paid each line.

**Files.** src/core2/budgets-treasury.ts, src/core2/data/outside-flows.json

**Notes.** Parent: `gov-outside-revenue-real-payers` (L, split by the claiming session, Oct 15). The plug is the three transfer prefixes `outside-revenue`, `treasury` and `federal-borrowing` in `src/core2/data/outside-flows.json`; the closure check is `scripts/core2-year/closures.mjs` check 6.
