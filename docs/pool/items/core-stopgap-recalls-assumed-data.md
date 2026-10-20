---
id: core-stopgap-recalls-assumed-data
title: "Stopgaps in recalls (assumed-data): 1 open"
area: core
kind: stopgap
priority: 3
status: blocked
claimed-by:
pr:
blocked-on: dataset-state-recall-timing-statutes-ncsl-blocked
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/recalls.ts, kind assumed-data"
---

**What.** Replace or clear the 1 open assumed-data stopgap row(s) in src/core2/modules/recalls.ts: SG-GOV-recall-bars-national. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/recalls.ts

**Notes.** First row: One national bar on when a local recall may start (not in a term's first 180 days; not again in a term after one failed), not each state's own statute.
