---
id: elections-stopgap-electorate-inputs-missing-data
title: "Stopgaps in electorate-inputs (missing-data): 1 open"
area: elections
kind: stopgap
priority: 3
status: blocked
claimed-by:
pr:
blocked-on: engine or design: No engine records the president's approval yet (the executive's record and the public's view of it).
milestone:
source: "src/core2/data/stopgaps.json, src/core2/electorate-inputs.ts, kind missing-data"
---

**What.** Replace or clear the 1 open missing-data stopgap row(s) in src/core2/electorate-inputs.ts: SG-GOV-electorate-approval. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/electorate-inputs.ts

**Notes.** First row: The national mood that moves every voter's choice for the president's party is read from the national economy since the opening (unemployment and inflation) and the midterm penalty, with no presidential approval behind i
