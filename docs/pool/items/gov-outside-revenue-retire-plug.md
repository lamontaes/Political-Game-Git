---
id: gov-outside-revenue-retire-plug
title: "Remove the monthly outside-revenue plug and its stopgap row"
area: gov
kind: stopgap
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
after: gov-outside-revenue-away-shares,gov-outside-revenue-taxes,gov-outside-revenue-fees,gov-outside-revenue-aid,gov-outside-revenue-borrowing,gov-outside-spending-payees
source: added with npm run pool -- add
---

**What.** Delete the three plug rows (`outside-revenue`, `treasury`, `federal-borrowing`) from `outside-flows.json`, the stopgap row SG-GOV-outside-revenue-monthly from `stopgaps.json`, and the markers in the code, once every family above has landed.

**Rules.** Replace, never layer; never close a stopgap row by deleting it before its replacement is read in play.

**Done when.** `scripts/core2-year/closures.mjs` check 6 passes in a drawn place with no plug rows matched or unmatched, and the stopgap row is gone. "The owner plays it:" the treasury statement has no line paid from nowhere.

**Files.** src/core2/data/outside-flows.json, src/core2/data/stopgaps.json, src/core2/modules/budgets.ts, src/core2/budgets-treasury.ts

**Notes.** Parent: `gov-outside-revenue-real-payers`.
