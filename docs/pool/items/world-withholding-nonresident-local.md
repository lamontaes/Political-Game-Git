---
id: world-withholding-nonresident-local
title: "A worker who lives elsewhere pays the town's local income tax at the nonresident rate"
area: world
kind: stopgap
priority: 2
size: M
status: blocked
claimed-by: claude/political-game-pool-3xfqef-2
pr:
blocked-on: world-commuters-in-opening
source: "split from gov-stopgap-budgets-faked-mechanic, Oct 16"
claimed-at: 2026-10-19T22:24:04.559Z
---

**What.** A worker who lives outside the town pays no county or city income tax to the town's jurisdictions for working there: the law rows' nonresident rate is never applied, and local tax is withheld only by the law at the worker's residence (SG-WORLD-withholding-nonresident-local). Resolve the workplace's local chain on each paycheck and apply each row's nonresident rate to residents of other jurisdictions, with the tax going to the town's treasury line. A commuter's paycheck then shows the tax of the place they work in.

**Rules.** Every dollar balances: the tax withheld from the paycheck is exactly the treasury line's receipt. Wire to the world: the treasury line, the worker's net pay and the budget read it. One rule, all 56 places: the rates are law rows, never named places.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56 with a local income tax row, seed named in the PR body) a named worker who lives outside the town has local tax withheld at the row's nonresident rate on a payday, shown by the paycheck record id and the treasury receipt record id, and SG-WORLD-withholding-nonresident-local is resolved; the budgets test passes.

**Files.** src/core2/modules/budgets.ts, src/core2/law-reach/group-b-money.ts, src/core2/data/stopgaps.json

**Notes.** Split from gov-stopgap-budgets-faked-mechanic. The other withholding rows (residence law, the base's exemptions) stay on their own stopgaps.

Looked at Oct 16 (claude/withholding-nonres), not built. The done-when needs a named worker who lives outside the town and works in it, and the played world has none yet: every employed resident lives in the town, since the commuters are the open item world-commuters-in-opening (and world-lodes-commutes for unplaced workers). Without a commuter there is no paycheck to withhold on and a test would need a hand-made fixture. Build that item first; then the nonresident row is a lookup of the workplace's local chain on the paycheck, in budgets.ts.

Checked Oct 19 (claude, nothing built). The law rows hold no nonresident rate to apply: `src/core2/data/laws/starting-law.json` has local income tax rows with a `typicalRate`, `rateMin` and `rateMax` per jurisdiction, and the only mention of nonresidents is free text on a New York row ("Yonkers resident surcharge and nonresident earnings tax"). So the item is first a research and data item: for each local jurisdiction that taxes earnings, whether a worker who lives elsewhere pays, at what rate (a nonresident rate, a reciprocity rule, or a credit against the home place's tax), with its source, for all 56 places. The withholding code is ready for it: `withholdPay` in `src/core2/modules/budgets.ts` reads the law at the worker's residence only (`residentLaw(api, person.placeId)`), and `postWithholding` already pays a line to the jurisdiction's treasury or its outside account. The build is then to read the workplace's chain beside the residence's. Add a data item for the nonresident rows (priority 2, research, laws area) and make this item `after:` it.
