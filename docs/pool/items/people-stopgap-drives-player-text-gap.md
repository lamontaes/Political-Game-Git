---
id: people-stopgap-drives-player-text-gap
title: "Stopgaps in drives (player-text-gap): 1 open"
area: people
kind: stopgap
priority: 3
status: open
claimed-by:
pr: #5287
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/drives.ts, kind player-text-gap"
claimed-at:
---

**What.** Replace or clear the 1 open player-text-gap stopgap row(s) in src/core2/modules/drives.ts: SG-P10-group-name-key. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/drives.ts

**Notes.** First row: A founded cause group carries a structured key in its name field instead of a name.
