---
id: gov-stopgap-budgets-faked-mechanic
title: "Stopgaps in budgets (faked-mechanic): 3 open"
area: gov
kind: stopgap
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/budgets.ts, kind faked-mechanic"
---

**What.** Replace or clear the 3 open faked-mechanic stopgap row(s) in src/core2/modules/budgets.ts: SG-GOV-outside-revenue-monthly, SG-WORLD-withholding-outside-governments, SG-WORLD-withholding-nonresident-local. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/budgets.ts

**Notes.** First row: Each month, a state, county, city or federal treasury receives from the town's outside account an even twelfth of the yearly revenue no flow in the game pays (state and federal aid come from the treasury above it), and p
