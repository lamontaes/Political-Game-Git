---
id: core-stopgap-parameters-uncalibrated-time-plan
title: "Stopgaps in parameters (uncalibrated-time-plan): 1 open"
area: core
kind: stopgap
priority: 3
status: blocked
claimed-by:
pr:
blocked-on: research data: the row's replacement needs sourced data (ATUS age/employment primary activity totals and participant durations using compatible crosswalks and observed individual spreads....)
milestone:
source: "src/core2/data/stopgaps.json, src/core2/data/parameters.json, kind uncalibrated-time-plan"
---

**What.** Replace or clear the 1 open uncalibrated-time-plan stopgap row(s) in src/core2/data/parameters.json: SG-P8-work-time-reserve. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/data/parameters.json

**Notes.** First row: Reserves guessed sleep hours and gives waking recovery a separate guessed duration.
