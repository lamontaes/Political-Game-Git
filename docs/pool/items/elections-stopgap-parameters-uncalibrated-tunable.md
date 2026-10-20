---
id: elections-stopgap-parameters-uncalibrated-tunable
title: "Stopgaps in parameters (uncalibrated-tunable): 1 open"
area: elections
kind: stopgap
priority: 3
status: claimed
claimed-by: claude/political-game-pool-3xfqef-7
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/data/candidacy/parameters.json, kind uncalibrated-tunable"
claimed-at: 2026-10-20T00:45:19.383Z
---

**What.** Replace or clear the 1 open uncalibrated-tunable stopgap row(s) in src/core2/data/candidacy/parameters.json: SG-P15-candidacy-weights. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/data/candidacy/parameters.json

**Notes.** First row: How much each recorded reason weighs in deciding to run for office, and the pull of staying out.
