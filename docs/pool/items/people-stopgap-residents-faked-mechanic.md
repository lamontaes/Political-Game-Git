---
id: people-stopgap-residents-faked-mechanic
title: "Stopgaps in residents (faked-mechanic): 1 open"
area: people
kind: stopgap
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/residents.ts, kind faked-mechanic"
---

**What.** Replace or clear the 1 open faked-mechanic stopgap row(s) in src/core2/modules/residents.ts: SG-CORE-filled-unplaced-income. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/residents.ts

**Notes.** First row: A filled-in household keeps its share of the place's unplaced workers' pay (counted workers no employer's books hold) as its own flow, untaxed, until it returns to the counts.
