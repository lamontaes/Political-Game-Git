---
id: core-stopgap-counted-drift-aggregate-population
title: "Stopgaps in counted-drift (aggregate-population): 3 open"
area: core
kind: stopgap
priority: 3
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/counted-drift.ts, kind aggregate-population"
---

**What.** Replace or clear the 3 open aggregate-population stopgap row(s) in src/core2/modules/counted-drift.ts: SG-CORE-counted-drift, SG-CORE-counted-moves, SG-CORE-counted-drift-named-workers. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/counted-drift.ts

**Notes.** First row: The wider population's deaths and births come from rates applied to the counts each month: SSA cohort life tables scaled by the state's 2017 age-adjusted death rate against the nation's (NCHS), and NCHS 2024 national bir
