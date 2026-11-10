---
id: gov-outside-revenue-retire-plug
title: "Remove the monthly outside-revenue plug and its stopgap row"
area: gov
kind: stopgap
priority: 1
size: S
status: dropped
claimed-by:
pr:
blocked-on:
after: gov-outside-revenue-taxes,gov-outside-revenue-fees,gov-outside-revenue-borrowing,gov-outside-spending-payees
standard: 2
model: sonnet
effort: medium
lead: governing
root: rc1-world-outside-town
source: added with npm run pool -- add
claimed-at:
checked: fable 2026-11-10
---

**What.** `closeMonth` in `src/core2/modules/budgets.ts` still pays every treasury an even twelfth of its yearly revenue and every spending line an even twelfth from the outside account, registered as stopgap SG-GOV-outside-revenue-monthly and marked plug in `src/core2/data/outside-flows.json`. Once the five sibling items have replaced each revenue and spending family with real payers and payees, this item deletes the plug code, its outside-flows rows and the stopgap row. The dollar test must then reject any flow still matching a plug row.

**Cause.** Found in code: src/core2/modules/budgets.ts function closeMonth (line 1006) and the plug rows in src/core2/data/outside-flows.json; stopgaps SG-GOV-outside-revenue-monthly and SG-GOV-service-charges-by-living-cost (marker in src/core2/budgets-service-charges.ts) are open in src/core2/data/stopgaps/gov.json.

**Fix.** After fees, delete the plug code, its outside-flows rows and the stopgap row, and resolve SG-GOV-service-charges-by-living-cost, so the dollar test rejects any plug-matched flow. Check one tax, one fee, one aid and one spending dollar to a named payer or payee. This item also takes the dropped roll-up gov-outside-revenue-real-payers, the rows of gov-standin-budgets-adopted-by-rule, and the withholding row of gov-stopgap-budgets-faked-mechanic.

**Time box.** 5 hours for one Sonnet session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** Replace, never layer: the old plug, its rows, its tests and its markers are deleted, and the PR body counts the lines and rows removed; Placeholders: a stopgap row is never closed by deleting it alone; it closes only because the replacements are built and shown; The chain is the acceptance: one tax dollar, one fee dollar and one spending dollar are each followed to a named person and back; One rule, all 56 places: the check runs in a drawn place with no place named in code; Speed: the year must stay within 20% of its base, measured before and after on the same machine.

**Done when.** A second session, in a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (both named in the PR body), finds `scripts/core2-year/closures.mjs` check 6 passing with zero plug rows matched and zero unmatched flows, src/core2/data/stopgaps/gov.json no longer holding SG-GOV-outside-revenue-monthly, `npm run speed:year` within 20% of base, and the tripwire tests passing. In the running game, the budget screen shows every revenue and spending line with a named payer or payee.

**Waits on.** gov-outside-revenue-fees.

**Files.** src/core2/modules/budgets.ts, src/core2/budgets-treasury.ts, src/core2/data/outside-flows.json, src/core2/data/stopgaps/gov.json, src/core2/budgets-service-charges.ts

**Notes.** Rewritten to the quality gate 2026-10-15 (the item was a stub when added with `npm run pool -- add`). Claim released Oct 23: branch gone.

Released Oct 20 (claude): siblings gov-outside-revenue-fees is still claimed and gov-outside-revenue-real-payers is blocked, so the plug still carries flows; retire it after both are done.

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have deleted the outside-revenue plug and its stopgap row once its sibling items finished; the plug is a registered stopgap and its sibling gov-outside-revenue-real-payers is dropped.
