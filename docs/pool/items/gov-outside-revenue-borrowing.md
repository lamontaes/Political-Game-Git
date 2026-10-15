---
id: gov-outside-revenue-borrowing
title: "The federal gap is borrowed from named lenders, and interest is paid to them"
area: gov
kind: stopgap
priority: 1
size: M
status: open
after: gov-outside-revenue-taxes,gov-outside-spending-payees
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Replace the monthly `federal-borrowing` plug with Treasury securities sold to named lender groups (households, banks, the Fed, foreign holders) at the rate in force, so interest on the debt (the net interest outlay) is paid to the same holders.

**Rules.** An effect is a read; the chain is the acceptance; one rule, all 56 places; no dice; estimate, never UNKNOWN; replace, never layer (the plug path for this family is deleted in the same change).

**Done when.** Each borrowing names its lender group and rate, interest paid goes to the same groups, and check 6 shows no `federal-borrowing` rows. "The owner plays it:" the town's treasury statement shows who paid each line.

**Files.** src/core2/budgets-treasury.ts, src/core2/data/outside-flows.json

**Notes.** Parent: `gov-outside-revenue-real-payers` (L, split by the claiming session, Oct 15). The plug is the three transfer prefixes `outside-revenue`, `treasury` and `federal-borrowing` in `src/core2/data/outside-flows.json`, written by `closeTreasuries` in `src/core2/budgets-treasury.ts`. The closure check is `scripts/core2-year/closures.mjs` check 6.
