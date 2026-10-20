---
id: gov-stopgap-budgets-assumed-data
title: "Stopgaps in budgets (assumed-data): 2 open"
area: gov
kind: stopgap
priority: 3
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/budgets.ts, kind assumed-data"
claimed-at:
---

**What.** Replace or clear the 2 open assumed-data stopgap row(s) in src/core2/modules/budgets.ts: SG-WORLD-withholding-residence-law, SG-WORLD-withholding-local-base. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/budgets.ts

**Notes.** First row: Payroll withholding for a worker who lives outside the town reads the law of the worker's residence from the starting-law rows (the town's recorded rows where a jurisdiction is shared with the town), so a law enacted in
