---
id: world-stopgap-housing-missing-mechanic
title: "Stopgaps in housing (missing-mechanic): 1 open"
area: world
kind: stopgap
priority: 3
status: blocked
claimed-by:
pr:
blocked-on: engine or design: New-unit occupancy and its vacancy changes are recorded; the opening rental stock has no individual unit inventory.
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/housing.ts, kind missing-mechanic"
---

**What.** Replace or clear the 1 open missing-mechanic stopgap row(s) in src/core2/modules/housing.ts: SG-WORLD-housing-vacancy. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/housing.ts

**Notes.** First row: Vacancy moves rents at renewal, but no household moves in to fill a vacant home: new apartments stay vacant.
