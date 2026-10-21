---
id: world-stopgap-finance-state-business-closure
title: "Stopgaps in finance-state (business-closure): 1 open"
area: world
kind: stopgap
priority: 3
status: blocked
claimed-by:
pr:
blocked-on: engine or design: WORLD's owners needed a way to close a solvent business; a full wind-down (final pay, settling payables, selling assets) is not built yet.
milestone:
source: "src/core2/data/stopgaps.json, src/core2/finance-state.ts, kind business-closure"
---

**What.** Replace or clear the 1 open business-closure stopgap row(s) in src/core2/finance-state.ts: SG-CORE-voluntary-closure-final-pay. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/finance-state.ts

**Notes.** First row: A business closed by its owner's choice pays its workers what they've earned (counted workers at once, full workers on their next payday from cash held back) and its supplier bills already owed; an open credit line's bal
