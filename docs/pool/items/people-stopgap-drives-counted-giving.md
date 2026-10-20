---
id: people-stopgap-drives-counted-giving
title: "Stopgaps in drives (counted-giving): 1 open"
area: people
kind: stopgap
priority: 3
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/drives.ts, kind counted-giving"
claimed-at:
---

**What.** Replace or clear the 1 open counted-giving stopgap row(s) in src/core2/modules/drives.ts: SG-CORE-counted-giving-stand-in. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/drives.ts

**Notes.** First row: Counted adults who give to a cause group give the mean of what the group's full members' own gift rule gives, once a month, because a counted giver has no drive or cash of their own.
