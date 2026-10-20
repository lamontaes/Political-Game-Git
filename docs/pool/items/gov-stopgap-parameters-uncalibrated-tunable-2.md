---
id: gov-stopgap-parameters-uncalibrated-tunable-2
title: "Stopgaps in parameters (uncalibrated-tunable): 1 open"
area: gov
kind: stopgap
priority: 3
status: blocked
claimed-by:
pr:
blocked-on: engine or design: The small justice engine needs a first version; the research gives the directions (Gordon 2009 on partisan prosecution, the Justice Manual's charging standard, the Sentencing Guidelines), not these co
milestone:
source: "src/core2/data/stopgaps.json, src/core2/data/justice/parameters.json, kind uncalibrated-tunable"
---

**What.** Replace or clear the 1 open uncalibrated-tunable stopgap row(s) in src/core2/data/justice/parameters.json: SG-GOV-justice-weights. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/data/justice/parameters.json

**Notes.** First row: How much traits, ties, evidence, prominence, party, money and the prosecutor's record weigh at each step from a report to a sentence.
