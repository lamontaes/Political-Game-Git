---
id: gov-stopgap-legislature-committees-assumed-data
title: "Stopgaps in legislature-committees (assumed-data): 1 open"
area: gov
kind: stopgap
priority: 3
status: blocked
claimed-by:
pr:
blocked-on: engine or design: The audit found every bill going to one 'general' committee. Each chamber's own committee list is not in the data yet; the nine subjects are the ones nearly every chamber keeps.
milestone:
source: "src/core2/data/stopgaps.json, src/core2/legislature-committees.ts, kind assumed-data"
---

**What.** Replace or clear the 1 open assumed-data stopgap row(s) in src/core2/legislature-committees.ts: SG-GOV-committee-names-national. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/legislature-committees.ts

**Notes.** First row: Every state chamber and Congress keeps the same nine subject committees (finance, judiciary, education, health, labor and commerce, transportation, environment, housing, government), not its own list and names.
