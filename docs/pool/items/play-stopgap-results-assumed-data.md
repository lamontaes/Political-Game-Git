---
id: play-stopgap-results-assumed-data
title: "Stopgaps in results (assumed-data): 1 open"
area: play
kind: stopgap
priority: 3
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/bench/results.ts, kind assumed-data"
---

**What.** Replace or clear the 1 open assumed-data stopgap row(s) in src/bench/results.ts: SG-PLAY-challenger-name. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/bench/results.ts

**Notes.** First row: Election night names a drawn challenger by repeating the voting module’s private identity draw (same seed, seat key and role).
