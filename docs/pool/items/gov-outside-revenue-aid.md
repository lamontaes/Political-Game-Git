---
id: gov-outside-revenue-aid
title: "Intergovernmental and federal aid lines are paid by the treasury of the level above, on its schedule"
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

**What.** Intergovernmental and federal aid (the `federalAid` and `intergovernmental` revenue lines) are paid by the treasury of the level above, on its schedule, when the payer is a government in the game. Today aid is already paid between treasuries in the game; what remains is the aid whose payer is a government the game does not hold (other states' federal share, other counties), which comes from the outside account, and the schedule (a twelfth a month rather than the program's own dates).

**Rules.** An effect is a read; the chain is the acceptance; one rule, all 56 places; no dice; estimate, never UNKNOWN; replace, never layer (the plug path for this family is deleted in the same change).

**Done when.** Aid arrives on the program's payment dates from a named payer government or, where the payer is not in the game, from a named outside government; check 6 shows no `outside-revenue` rows for aid lines. "The owner plays it:" the town's treasury statement shows who paid each line.

**Files.** src/core2/budgets-treasury.ts, src/core2/data/budgets/treasury-spending.json, src/core2/data/outside-flows.json

**Notes.** Parent: `gov-outside-revenue-real-payers` (L, split by the claiming session, Oct 15). The plug is the three transfer prefixes `outside-revenue`, `treasury` and `federal-borrowing` in `src/core2/data/outside-flows.json`, written by `closeTreasuries` in `src/core2/budgets-treasury.ts`. The closure check is `scripts/core2-year/closures.mjs` check 6.
