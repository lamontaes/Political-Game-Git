---
id: core-stopgap-work-uncalibrated-choice-mapping
title: "Stopgaps in work (uncalibrated-choice-mapping): 1 open"
area: core
kind: stopgap
priority: 3
status: blocked
claimed-by:
pr:
blocked-on: engine or design: Commitment magnitude and daily segment attendance policy are uncalibrated; detailed health/care constraints are absent.
milestone:
source: "src/core2/data/stopgaps.json, src/core2/data/work.json, kind uncalibrated-choice-mapping"
---

**What.** Replace or clear the 1 open uncalibrated-choice-mapping stopgap row(s) in src/core2/data/work.json: SG-P8-attendance-choice. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/data/work.json

**Notes.** First row: Scores attendance versus absence from current needs, traits, affect and an ongoing work-goal prior.
