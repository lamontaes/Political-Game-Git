---
id: world-stopgap-retirement-claims-program-stand-in
title: "Stopgaps in retirement-claims (program-stand-in): 1 open"
area: world
kind: stopgap
priority: 3
status: blocked
claimed-by:
pr:
blocked-on: engine or design: WORLD's jobs engine retires people during play, and nothing started their benefits, so retirees lost all income.
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/retirement-claims.ts, kind program-stand-in"
---

**What.** Replace or clear the 1 open program-stand-in stopgap row(s) in src/core2/modules/retirement-claims.ts: SG-CORE-retirement-claims-in-play. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/retirement-claims.ts

**Notes.** First row: People who reach their claim age during play, full or counted, start a Social Security award sized like the opening's (a participant-average amount scaled by modeled covered months), paid monthly by the place's outside p
