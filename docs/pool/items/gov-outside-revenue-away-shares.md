---
id: gov-outside-revenue-away-shares
title: "The outside share of income, payroll, sales and property taxes is paid by outside payer groups on due dates"
area: gov
kind: stopgap
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "split from gov-outside-revenue-real-payers; stopgap SG-GOV-outside-revenue-monthly"
---

**What.** Give the outside world the payers a treasury's revenue needs, and use them for the outside share of the lines the town's own flows already pay (individual income, payroll and general sales taxes, property tax). Today `closeTreasuries` credits a government `amount * (1 - townShare)` of each such line from the outside account with no taxpayer behind it. Build counted payer groups outside the town (the rest of the county, state and nation), each read by the same rules as a full person, times its count (one model, two tiers); each owes the line by the law in force and its counted income, spending and property, on the line's due dates (withholding monthly, sales tax remitted monthly, property tax in installments). This item creates the payer table the taxes, fees and aid items reuse.

**Rules.** An effect is a read; the chain is the acceptance; one rule, all 56 places; no dice; estimate, never UNKNOWN; replace, never layer (the plug path for this family is deleted in the same change).

**Done when.** In a drawn place the away share of each town-paid line arrives from named payer groups on due dates, named by record id; the group totals reproduce the Census yearly line within its spread; check 6 shows no `outside-revenue` rows for these lines. "The owner plays it:" the town's treasury statement shows who paid each line.

**Files.** src/core2/budgets-treasury.ts, src/core2/modules/budgets.ts, src/core2/data/outside-flows.json, src/core2/data/budgets/

**Notes.** Parent: `gov-outside-revenue-real-payers` (L, split by the claiming session, Oct 15). The plug is the three transfer prefixes `outside-revenue`, `treasury` and `federal-borrowing` in `src/core2/data/outside-flows.json`, written by `closeTreasuries` in `src/core2/budgets-treasury.ts`. The closure check is `scripts/core2-year/closures.mjs` check 6.
