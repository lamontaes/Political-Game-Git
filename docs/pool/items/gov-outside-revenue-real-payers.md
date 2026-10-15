---
id: gov-outside-revenue-real-payers
title: "Replace the monthly outside-revenue plug: each revenue line from its real payer, each spending line to its real payees"
area: gov
kind: stopgap
priority: 1
size: L
status: blocked
claimed-by: claude/gov-outside-revenue-real-payers
pr:
blocked-on: gov-outside-revenue-retire-plug
milestone:
source: "split from core-outside-flow-provenance-gate; stopgap SG-GOV-outside-revenue-monthly"
claimed-at: 2026-10-15T22:06:14.562Z
---

**What.** Each month `budgets.ts` (`closeMonth`, `budgets-treasury.ts`) credits every treasury an even twelfth of yearly Census revenue from the outside account (in the vaitogi seed about $5.2 trillion in a year, plus federal borrowing and treasury spending flows), with no taxpayer, sale or grant behind it. Replace it: each revenue line paid by its real payer on its real dates (taxpayers, fee payers, aid from the level above), each spending line paid to real payees (public workers, contractors). The federal gap is borrowed from named lenders. Size L: split into one sub-item per government level or revenue family before building.

**Rules.** An effect is a read; the chain is the acceptance; one rule, all 56 places; no dice; estimate, never UNKNOWN.

**Done when.** `scripts/core2-year/closures.mjs` check 6 passes in a drawn place (no plug rows matched, none unmatched) and the stopgap row is removed from `stopgaps.json`.

**Files.** src/core2/modules/budgets.ts, src/core2/budgets-treasury.ts, src/core2/data/outside-flows.json, src/core2/data/stopgaps.json

**Notes.** Blocks `core-outside-flow-provenance-gate`. See also the open item `gov-stopgap-budgets-faked-mechanic`.

Split into seven bounded items by `claude/gov-outside-revenue-real-payers` (#4462), Oct 15: the outside share of town-paid taxes, other taxes, fees, aid, borrowing, spending payees, then the plug's removal.
