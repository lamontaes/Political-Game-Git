---
id: people-stopgap-residents-assumed-data
title: "Stopgaps in residents (assumed-data): 1 open"
area: people
kind: stopgap
priority: 3
status: dropped
claimed-by:
pr:
blocked-on: research-residents-sourced-parameters
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/residents.ts, kind assumed-data"
---

**What.** Replace or clear the 1 open assumed-data stopgap row(s) in src/core2/modules/residents.ts: SG-CORE-district-placement. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/residents.ts

**Notes.** First row: A town split between state legislative districts places its counted households into the districts by income order, filling each district in proportion to its Census population in the town, so each district holds a slice

Folded into research-residents-sourced-parameters (CTO, Oct 19, 2026).
