---
id: core-stopgap-world-races-missing-data
title: "Stopgaps in world-races (missing-data): 2 open"
area: core
kind: stopgap
priority: 3
status: in-pr
claimed-by: claude/world-races-delegate
pr: #5304
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/world-races.ts, kind missing-data"
claimed-at: 2026-10-19T23:46:51.395Z
---

**What.** Replace or clear the 2 open missing-data stopgap row(s) in src/core2/modules/world-races.ts: SG-GOV-world-race-lean, SG-GOV-delegate-race-size. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/world-races.ts

**Notes.** First row: A race the town doesn't vote in is counted on the counted residents' engine at a coarser level (a House district's, the state's counties', a legislative district's eligible voters, voting as the town's counted residents
