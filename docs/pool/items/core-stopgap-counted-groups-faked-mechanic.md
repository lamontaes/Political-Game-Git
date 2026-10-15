---
id: core-stopgap-counted-groups-faked-mechanic
title: "Stopgaps in counted-groups (faked-mechanic): 1 open"
area: core
kind: stopgap
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/counted-groups.ts, kind faked-mechanic"
---

**What.** Replace or clear the 1 open faked-mechanic stopgap row(s) in src/core2/counted-groups.ts: SG-CORE-counted-person-views. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/counted-groups.ts

**Notes.** First row: Engines that still read counted people one by one (jobs, business, campaigns, retirement claims, housing, place prices, candidacy) get a person or household record built on demand from the counted group's packed columns,
