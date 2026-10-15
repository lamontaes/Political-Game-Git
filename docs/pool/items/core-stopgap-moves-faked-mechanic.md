---
id: core-stopgap-moves-faked-mechanic
title: "Stopgaps in moves (faked-mechanic): 3 open"
area: core
kind: stopgap
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/moves.ts, kind faked-mechanic"
---

**What.** Replace or clear the 3 open faked-mechanic stopgap row(s) in src/core2/modules/moves.ts: SG-P15-moves-owners-stay, SG-P15-moves-pinned-jobs, SG-FIXER-moves-income-household. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/moves.ts

**Notes.** First row: A household that owns its home with a mortgage never leaves together; only a grown child in it can move out.
