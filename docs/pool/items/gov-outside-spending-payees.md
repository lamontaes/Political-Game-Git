---
id: gov-outside-spending-payees
title: "Treasury spending that leaves the town goes to real payees: contractors, public workers elsewhere, benefit recipients, bondholders"
area: gov
kind: stopgap
priority: 1
size: M
status: open
after: gov-outside-revenue-away-shares
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Replace the monthly treasury spending to the outside account (the `treasury` prefix) with payments to real payees: public workers outside the town on their paydays, contractors for the purchased share of each line, benefit recipients, and bondholders for interest. In-town payees already paid stay as they are.

**Rules.** An effect is a read; the chain is the acceptance; one rule, all 56 places; no dice; estimate, never UNKNOWN; replace, never layer (the plug path for this family is deleted in the same change).

**Done when.** Each spending line names its payee group and payday and the line totals equal the adopted budget; check 6 shows no `treasury` plug rows. "The owner plays it:" the town's treasury statement shows who paid each line.

**Files.** src/core2/budgets-treasury.ts, src/core2/data/budgets/treasury-spending.json, src/core2/data/outside-flows.json

**Notes.** Parent: `gov-outside-revenue-real-payers` (L, split by the claiming session, Oct 15). The plug is the three transfer prefixes `outside-revenue`, `treasury` and `federal-borrowing` in `src/core2/data/outside-flows.json`, written by `closeTreasuries` in `src/core2/budgets-treasury.ts`. The closure check is `scripts/core2-year/closures.mjs` check 6.
