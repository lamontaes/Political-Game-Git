---
id: gov-stopgap-budgets-assumed-data
title: "Stopgaps in budgets (assumed-data): 2 open"
area: gov
kind: stopgap
priority: 3
status: blocked
claimed-by:
pr:
blocked-on: research data: the row's replacement needs recorded, empirical or sourced data (Each place's law chain recorded in the laws module, enacted acts included, read for every worker's residence. Personal exemptions and adjustments read...)
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/budgets.ts, kind assumed-data"
claimed-at:
---

**What.** Replace or clear the 2 open assumed-data stopgap row(s) in src/core2/modules/budgets.ts: SG-WORLD-withholding-residence-law, SG-WORLD-withholding-local-base. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/budgets.ts

**Notes.** First row: Payroll withholding for a worker who lives outside the town reads the law of the worker's residence from the starting-law rows (the town's recorded rows where a jurisdiction is shared with the town), so a law enacted in

Looked at Oct 20 (claude/political-game-pool-3xfqef-6), released unbuilt. SG-WORLD-withholding-residence-law needs each other place's law chain opened as a recorded world (enacted acts included) so a worker's residence law can be read; today only the town's chain is recorded, so it is the engine item `laws-other-places-chains` (not yet in the pool; a builder files it). SG-WORLD-withholding-local-base needs personal exemptions and adjustments as sourced numbers in the law rows (`starting-law.json` names the base and carries no amounts) and pre-tax deductions on the workers' records; the amounts are research data per state and local row, then a read in the withholding step. Neither is a change a session can finish without that input.
