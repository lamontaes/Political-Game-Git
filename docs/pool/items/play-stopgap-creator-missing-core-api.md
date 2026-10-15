---
id: play-stopgap-creator-missing-core-api
title: "Stopgaps in creator (missing-core-api): 1 open"
area: play
kind: stopgap
priority: 3
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/bench/creator.ts, kind missing-core-api"
---

**What.** Replace or clear the 1 open missing-core-api stopgap row(s) in src/bench/creator.ts: SG-PLAY-creator-direct-person-write. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/bench/creator.ts

**Notes.** First row: New game writes the chosen name, birth date, gender and appearance recipe straight onto the new world's player record from the play handler, instead of through a core API.
