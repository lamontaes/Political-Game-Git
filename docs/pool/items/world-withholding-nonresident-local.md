---
id: world-withholding-nonresident-local
title: "A worker who lives elsewhere pays the town's local income tax at the nonresident rate"
area: world
kind: stopgap
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "split from gov-stopgap-budgets-faked-mechanic, Oct 16"
---

**What.** A worker who lives outside the town pays no county or city income tax to the town's jurisdictions for working there: the law rows' nonresident rate is never applied, and local tax is withheld only by the law at the worker's residence (SG-WORLD-withholding-nonresident-local). Resolve the workplace's local chain on each paycheck and apply each row's nonresident rate to residents of other jurisdictions, with the tax going to the town's treasury line. A commuter's paycheck then shows the tax of the place they work in.

**Rules.** Every dollar balances: the tax withheld from the paycheck is exactly the treasury line's receipt. Wire to the world: the treasury line, the worker's net pay and the budget read it. One rule, all 56 places: the rates are law rows, never named places.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56 with a local income tax row, seed named in the PR body) a named worker who lives outside the town has local tax withheld at the row's nonresident rate on a payday, shown by the paycheck record id and the treasury receipt record id, and SG-WORLD-withholding-nonresident-local is resolved; the budgets test passes.

**Files.** src/core2/modules/budgets.ts, src/core2/law-reach/group-b-money.ts, src/core2/data/stopgaps.json

**Notes.** Split from gov-stopgap-budgets-faked-mechanic. The other withholding rows (residence law, the base's exemptions) stay on their own stopgaps.
