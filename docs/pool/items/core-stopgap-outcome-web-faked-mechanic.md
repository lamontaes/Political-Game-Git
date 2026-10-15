---
id: core-stopgap-outcome-web-faked-mechanic
title: "Stopgaps in outcome-web (faked-mechanic): 1 open"
area: core
kind: stopgap
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/outcome-web.ts, kind faked-mechanic"
---

**What.** Replace or clear the 1 open faked-mechanic stopgap row(s) in src/core2/modules/outcome-web.ts: SG-WEB-outcome-drift. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/outcome-web.ts

**Notes.** First row: Each outcome the web keeps (crime, schooling, coverage, turnout and the rest) stays at its place's real starting level except where a researched link moves it; nothing else in the world moves it.
