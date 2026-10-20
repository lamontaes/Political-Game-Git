---
id: gov-outside-revenue-retire-plug
title: "Remove the monthly outside-revenue plug and its stopgap row"
area: gov
kind: stopgap
priority: 1
size: S
status: claimed
claimed-by: claude/outside-revenue
pr:
blocked-on:
after: gov-outside-revenue-taxes,gov-outside-revenue-fees,gov-outside-revenue-borrowing,gov-outside-spending-payees
source: added with npm run pool -- add
claimed-at: 2026-10-20T02:01:25.963Z
---

**What.** `closeMonth` in `src/core2/modules/budgets.ts` still pays every treasury an even twelfth of its yearly revenue and every spending line an even twelfth from the outside account, registered as stopgap SG-GOV-outside-revenue-monthly and marked plug in `src/core2/data/outside-flows.json`. Once the five sibling items have replaced each revenue and spending family with real payers and payees, this item deletes the plug code, its outside-flows rows and the stopgap row. The dollar test must then reject any flow still matching a plug row.

**Rules.** Replace, never layer: the old plug, its rows, its tests and its markers are deleted, and the PR body counts the lines and rows removed; Placeholders: a stopgap row is never closed by deleting it alone; it closes only because the replacements are built and shown; The chain is the acceptance: one tax dollar, one fee dollar and one spending dollar are each followed to a named person and back; One rule, all 56 places: the check runs in a drawn place with no place named in code; Speed: the year must stay within 20% of its base, measured before and after on the same machine.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): `scripts/core2-year/closures.mjs` check 6 passes with zero plug rows matched and zero unmatched flows, `stopgaps.json` no longer holds SG-GOV-outside-revenue-monthly, `npm run speed:year` is within 20% of base, and the tripwire tests pass. The owner plays it: opens the budget screen and every revenue and spending line has a named payer or payee.

**Files.** src/core2/modules/budgets.ts, src/core2/budgets-treasury.ts, src/core2/data/outside-flows.json, src/core2/data/stopgaps.json

**Notes.** Rewritten to the quality gate 2026-10-15 (the item was a stub when added with `npm run pool -- add`).
