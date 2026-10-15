---
id: world-stopgap-housing-construction-faked-mechanic
title: "Stopgaps in housing-construction (faked-mechanic): 1 open"
area: world
kind: stopgap
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/housing-construction.ts, kind faked-mechanic"
---

**What.** Replace or clear the 1 open faked-mechanic stopgap row(s) in src/core2/housing-construction.ts: SG-WORLD-housing-new-home-buyers. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/housing-construction.ts

**Notes.** First row: New houses sell only to full renter households; counted renters and households moving in never buy one, so unsold houses pile up.
