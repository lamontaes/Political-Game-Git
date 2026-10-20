---
id: world-stopgap-housing-foreclosure-assumed-data
title: "Stopgaps in housing-foreclosure (assumed-data): 1 open"
area: world
kind: stopgap
priority: 3
status: blocked
claimed-by:
pr:
blocked-on: research data: the row's replacement needs sourced data (Each place's foreclosure steps read from its statute text and court rules, with its own average days to complete....)
milestone:
source: "src/core2/data/stopgaps.json, src/core2/housing-foreclosure.ts, kind assumed-data"
---

**What.** Replace or clear the 1 open assumed-data stopgap row(s) in src/core2/housing-foreclosure.ts: SG-WORLD-housing-foreclosure-steps. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/housing-foreclosure.ts

**Notes.** First row: A state's foreclosure timeline that was not read from its statute (or that has no published average) is taken from secondary summaries or the national average days to complete.
