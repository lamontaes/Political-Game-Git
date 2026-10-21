---
id: people-stopgap-health-missing-mechanic
title: "Stopgaps in health (missing-mechanic): 1 open"
area: people
kind: stopgap
priority: 3
status: blocked
claimed-by:
pr:
blocked-on: engine or design: P10 needs a real recorded death from illness; no core2 health engine exists.
milestone:
source: "src/core2/data/stopgaps.json, src/core2/data/health.json, kind missing-mechanic"
---

**What.** Replace or clear the 1 open missing-mechanic stopgap row(s) in src/core2/data/health.json: SG-P10-health-minimal-port. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/data/health.json

**Notes.** First row: Only the opening chronic conditions, the serious-illness onset and the death of the Ruling 29/38/39 mortality rule run in core2; conditions beginning during life, coverage, poverty onset causes, injuries and births are a
