---
id: core-stopgap-parameters-authored-memory-budget
title: "Stopgaps in parameters (authored-memory-budget): 1 open"
area: core
kind: stopgap
priority: 3
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/data/parameters.json, kind authored-memory-budget"
---

**What.** Replace or clear the 1 open authored-memory-budget stopgap row(s) in src/core2/data/parameters.json: SG-P8-work-result-retention. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/data/parameters.json

**Notes.** First row: Retains latest/cumulative work results and a tunable finite number of quiet weekly rollups.
