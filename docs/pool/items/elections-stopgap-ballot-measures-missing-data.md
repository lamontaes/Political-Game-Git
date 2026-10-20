---
id: elections-stopgap-ballot-measures-missing-data
title: "Stopgaps in ballot-measures (missing-data): 1 open"
area: elections
kind: stopgap
priority: 3
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/ballot-measures.ts, kind missing-data"
claimed-at:
---

**What.** Replace or clear the 1 open missing-data stopgap row(s) in src/core2/modules/ballot-measures.ts: SG-GOV-measure-groups-stand-in. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/ballot-measures.ts

**Notes.** First row: On a statewide ballot measure, the voters the world doesn't name vote as even lean bands around the state's 2024 presidential lean, sized by the state's 2024 vote, each band voting its own view of the question (no separa
