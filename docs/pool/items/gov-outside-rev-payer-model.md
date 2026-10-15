---
id: gov-outside-rev-payer-model
title: "Outside payers exist as counted groups that owe the revenue lines"
area: gov
kind: stopgap
priority: 1
size: M
status: open
claimed-by:
pr:
after: 
blocked-on:
milestone:
source: "split from gov-outside-revenue-real-payers; stopgap SG-GOV-outside-revenue-monthly"
---

**What.** Give the outside world the payers a treasury's revenue needs: counted groups of taxpayers, fee payers and buyers outside the town (by level: the rest of the county, state, nation), each a group read by the same rules as a full person (one model, two tiers). Their tax due on each revenue line comes from the law in force and their counted income, sales and property, not from a Census twelfth. Build the payer table and the rule that computes what each group owes a line and when it falls due; no treasury is changed yet.

**Rules.** An effect is a read; the chain is the acceptance; one rule, all 56 places; no dice; estimate, never UNKNOWN; replace, never layer (the plug path for this family is deleted in the same change).

**Done when.** In a drawn place a payer group exists for each non-aid revenue line of the state, county, city and federal budget, with an amount owed by law and a due date, named by record id; a test proves the owed totals reproduce the Census yearly line within the spread. "The owner plays it:" the town's treasury statement shows who paid each line.

**Files.** src/core2/modules/budgets.ts, src/core2/budgets-treasury.ts, src/core2/data/budgets/

**Notes.** Parent: `gov-outside-revenue-real-payers` (L, split by the claiming session, Oct 15). The plug is the three transfer prefixes `outside-revenue`, `treasury` and `federal-borrowing` in `src/core2/data/outside-flows.json`; the closure check is `scripts/core2-year/closures.mjs` check 6.
