---
id: gov-outside-revenue-fees
title: "Charges, fees and miscellaneous revenue are paid by the people and businesses that use the service"
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

**What.** Charges, fees and miscellaneous revenue (all levels) are paid by the people and businesses that use the service, tied to the spending line that provides it (a water bill to the water line, tuition to the school line), not an even twelfth from outside. Reuse the payer groups from `gov-outside-revenue-away-shares`.

**Rules.** An effect is a read; the chain is the acceptance; one rule, all 56 places; no dice; estimate, never UNKNOWN; replace, never layer (the plug path for this family is deleted in the same change).

**Done when.** In a drawn place each charge arrives from a named paying group and names the service line; check 6 shows no `outside-revenue` rows for chargesAndFees or miscellaneous. "The owner plays it:" the town's treasury statement shows who paid each line.

**Files.** src/core2/budgets-treasury.ts, src/core2/data/outside-flows.json

**Notes.** Parent: `gov-outside-revenue-real-payers` (L, split by the claiming session, Oct 15). The plug is the three transfer prefixes `outside-revenue`, `treasury` and `federal-borrowing` in `src/core2/data/outside-flows.json`, written by `closeTreasuries` in `src/core2/budgets-treasury.ts`. The closure check is `scripts/core2-year/closures.mjs` check 6.
