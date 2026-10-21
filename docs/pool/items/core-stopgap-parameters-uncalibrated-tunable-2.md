---
id: core-stopgap-parameters-uncalibrated-tunable-2
title: "Stopgaps in parameters (uncalibrated-tunable): 1 open"
area: core
kind: stopgap
priority: 3
status: dropped
claimed-by:
pr:
blocked-on: research-core-parameters-sourced-parameters
milestone:
source: "src/core2/data/stopgaps.json, src/core2/data/speech/parameters.json, kind uncalibrated-tunable"
---

**What.** Replace or clear the 1 open uncalibrated-tunable stopgap row(s) in src/core2/data/speech/parameters.json: SG-P15-speech-reception. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/data/speech/parameters.json

**Notes.** First row: How much a speech moves listeners and who retells it; retelling reaches only the listener's household.

Folded into research-core-parameters-sourced-parameters (CTO, Oct 19, 2026).
