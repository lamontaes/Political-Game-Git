---
id: people-stopgap-residents-aggregate-cadence
title: "Stopgaps in residents (aggregate-cadence): 1 open"
area: people
kind: stopgap
priority: 3
status: dropped
claimed-by:
pr:
blocked-on: research-residents-sourced-parameters
milestone:
source: "src/core2/data/stopgaps.json, src/core2/residents.ts, kind aggregate-cadence"
---

**What.** Replace or clear the 1 open aggregate-cadence stopgap row(s) in src/core2/residents.ts: SG-CORE-residents-cadence. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/residents.ts

**Notes.** First row: The wider population's purchases are merged per seller, kind and week of the month and paid monthly instead of after each household's own paydays; count workers always work their full schedule and are paid on the employe

Folded into research-residents-sourced-parameters (CTO, Oct 19, 2026).
