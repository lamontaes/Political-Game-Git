---
id: gov-outside-revenue-taxes
title: "Taxes the town's flows do not pay (corporate, excise, vehicle, customs, estate) come from real payers"
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

**What.** Taxes the town's flows do not pay at all (corporate income, excise, vehicle and other taxes, customs duties, estate and gift taxes, selective sales taxes) are paid by real payers on real dates: businesses for corporate tax, importers for customs, estates for estate tax, owners for vehicle taxes. Reuse the payer groups from `gov-outside-revenue-away-shares`. Delete the `outside-revenue` credit for these lines.

**Rules.** An effect is a read; the chain is the acceptance; one rule, all 56 places; no dice; estimate, never UNKNOWN; replace, never layer (the plug path for this family is deleted in the same change).

**Done when.** In a drawn place each of these lines arrives from a named payer on its due date, by record id; the yearly total stays within the Census (or Monthly Treasury Statement) line's spread; check 6 shows no `outside-revenue` rows for them. "The owner plays it:" the town's treasury statement shows who paid each line.

**Files.** src/core2/budgets-treasury.ts, src/core2/modules/budgets.ts, src/core2/data/outside-flows.json

**Notes.** Parent: `gov-outside-revenue-real-payers` (L, split by the claiming session, Oct 15). The plug is the three transfer prefixes `outside-revenue`, `treasury` and `federal-borrowing` in `src/core2/data/outside-flows.json`, written by `closeTreasuries` in `src/core2/budgets-treasury.ts`. The closure check is `scripts/core2-year/closures.mjs` check 6.
