---
id: gov-outside-revenue-real-payers
title: "Replace the monthly outside-revenue plug: each revenue line from its real payer, each spending line to its real payees"
area: gov
kind: stopgap
priority: 1
size: L
status: blocked
claimed-by: claude/gov-outside-revenue-real-payers
pr: #4475
blocked-on:
milestone:
after: gov-outside-revenue-taxes,gov-outside-revenue-fees,gov-outside-revenue-aid,gov-outside-revenue-borrowing,gov-outside-spending-payees,gov-outside-revenue-retire-plug
source: "split from core-outside-flow-provenance-gate; stopgap SG-GOV-outside-revenue-monthly"
claimed-at: 2026-10-15T22:06:14.562Z
---

**What.** This is the roll-up for replacing the monthly outside-revenue plug (stopgap SG-GOV-outside-revenue-monthly). `closeMonth` in src/core2/modules/budgets.ts used to credit every treasury an even twelfth of its yearly revenue from the outside account; the work is split by revenue and spending family: gov-outside-revenue-taxes, gov-outside-revenue-fees (with its data and wiring parts), gov-outside-revenue-aid, gov-outside-revenue-borrowing and gov-outside-spending-payees, then gov-outside-revenue-retire-plug deletes the plug code, its rows and the stopgap. When those are done this item is closed by checking the whole picture once in a played world: every revenue line has a named payer on its real date and every spending line a named payee.

**Rules.** The chain is the acceptance: the roll-up closes only when one tax dollar, one fee dollar, one aid dollar and one spending dollar are each followed from the treasury to a named person or organization. An effect is a read: each line's amount is read from the law and budget in force when it pays. One rule, all 56 places: the check runs in a drawn place with no place named in code. No dice: payers and payees follow law, program rules and records. Estimate, never UNKNOWN: an unsourced payer share is a registered estimate with its source.

**Done when.** After the child items are done, a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (both named in the PR body) passes `scripts/core2-year/closures.mjs` check 6 with no plug rows matched and none unmatched, SG-GOV-outside-revenue-monthly is gone from stopgaps.json, and src/core2/budgets.test.ts names the traced dollars by journal record id. The owner plays it: opens the budget screen and every line has a named payer or payee.

**Files.** src/core2/modules/budgets.ts, src/core2/budgets-treasury.ts, src/core2/data/outside-flows.json, src/core2/data/stopgaps.json, src/core2/budgets.test.ts

**Notes.** Blocks `core-outside-flow-provenance-gate`. See also the open item `gov-stopgap-budgets-faked-mechanic`.

Session handed off Oct 15, 2026: nothing pushed (claim only, no branch on the remote); remainder: the whole item.

Oct 20 (pool feeder): spec written; the item's own split already exists as pool items (taxes, aid, borrowing, spending-payees done; fees claimed; retire-plug claimed and waiting on fees); this item is only the roll-up and closes after retire-plug.
