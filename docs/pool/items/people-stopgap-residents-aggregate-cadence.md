---
id: people-stopgap-residents-aggregate-cadence
title: "Stopgaps in residents (aggregate-cadence): 1 open"
area: people
kind: stopgap
priority: 3
status: blocked
claimed-by:
pr:
blocked-on: research data: the row's replacement needs sourced data (Wider-population spending timed from the counts' pay dates and income, with absence and turnover rates by industry checked against BLS JOLTS and CPS....)
milestone:
source: "src/core2/data/stopgaps.json, src/core2/residents.ts, kind aggregate-cadence"
---

**What.** Replace or clear the 1 open aggregate-cadence stopgap row(s) in src/core2/residents.ts: SG-CORE-residents-cadence. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/residents.ts

**Notes.** First row: The wider population's purchases are merged per seller, kind and week of the month and paid monthly instead of after each household's own paydays; count workers always work their full schedule and are paid on the employe
