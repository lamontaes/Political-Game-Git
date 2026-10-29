---
id: laws-bill-before-reads-bill-level
title: "A bill's 'in force today' and its paper's 'before' read different rows: the paper takes the first level with a row (the federal 37% in Delaware), the catalog falls back across levels, and a budget line has no today amount"
area: laws
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** In Brookside, Delaware (seed 4d50e1f88df997f9, found by the lane on #6843's bill screens), for the same income-tax series the draft card's 'In force today' reads 0% while the bill paper's 'before' reads a 37% top rate. Cause by line: billSections (src/core2/modules/legislature.ts ~1680-1682) takes answer.levels.find((l) => l.row), the first level in the chain with a row, which is the federal row, whatever level the bill legislates at; billCatalog (src/core2/bill-catalog.ts:85) reads currentAmount (legislature.ts ~1318-1329), which reads the bill's own level but for a state bill falls back to the federal row (at('state') ?? at('federal')), right for a minimum wage (a floor) and wrong for an income tax (the levels stack). A budget-line policy has no series, so the catalog's inForce is null and the card shows no today amount, while the paper reads the provision's own 'of'.

**Rules.** One engine per mechanic: both screens read one function for the row in force at the bill's own level (billLevel), so a view never computes its own version of the law in force. Wire to the world: the before value a member drafts against is the law the town lives under at that level. One rule, all 56 places: stacking versus floor comes from the series' data, never a named series in a screen.

**Done when.** In a buildBenchWorld world drawn from all 56 (place and seed named), for an income-tax bill at the state level and at the city level and for a budget-line bill, the catalog's in-force value and the bill paper's before value are equal and match the law row (or the budget line in force) at the bill's own level, by law or budget record id; a test in src/core2 proves it on two seeds, and Brookside, Delaware (seed 4d50e1f88df997f9) no longer shows 37% for a state or town income-tax bill.

**Files.** src/core2/modules/legislature.ts, src/core2/bill-catalog.ts

**Notes.** Filed Oct 29 by the laws lead from the CTO's relay of the play-first lane's finding on #6843 (bill screens). Read: the CTO's message; billSections and currentAmount on main 23:40 UTC.
