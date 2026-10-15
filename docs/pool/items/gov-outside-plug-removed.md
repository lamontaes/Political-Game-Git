---
id: gov-outside-plug-removed
title: "Remove the outside-revenue stopgap and the three plug rows"
area: gov
kind: stopgap
priority: 1
size: S
status: open
claimed-by:
pr:
after: gov-outside-rev-local-taxes,gov-outside-rev-state-taxes,gov-outside-rev-federal-taxes,gov-outside-rev-fees-misc,gov-outside-spend-payees,gov-outside-federal-borrowing
blocked-on:
milestone:
source: "split from gov-outside-revenue-real-payers; stopgap SG-GOV-outside-revenue-monthly"
---

**What.** Delete the plug rows from outside-flows.json, the stopgap row SG-GOV-outside-revenue-monthly from stopgaps.json and the markers in the code.

**Rules.** An effect is a read; the chain is the acceptance; one rule, all 56 places; no dice; estimate, never UNKNOWN; replace, never layer (the plug path for this family is deleted in the same change).

**Done when.** `scripts/core2-year/closures.mjs` check 6 passes in a drawn place with no plug rows matched or unmatched; the stopgap row is gone. "The owner plays it:" the town's treasury statement shows who paid each line.

**Files.** src/core2/data/outside-flows.json, src/core2/data/stopgaps.json, src/core2/modules/budgets.ts

**Notes.** Parent: `gov-outside-revenue-real-payers` (L, split by the claiming session, Oct 15). The plug is the three transfer prefixes `outside-revenue`, `treasury` and `federal-borrowing` in `src/core2/data/outside-flows.json`; the closure check is `scripts/core2-year/closures.mjs` check 6.
