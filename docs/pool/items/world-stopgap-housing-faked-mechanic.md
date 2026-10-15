---
id: world-stopgap-housing-faked-mechanic
title: "Stopgaps in housing (faked-mechanic): 3 open"
area: world
kind: stopgap
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/housing.ts, kind faked-mechanic"
---

**What.** Replace or clear the 3 open faked-mechanic stopgap row(s) in src/core2/modules/housing.ts: SG-WORLD-housing-landlord, SG-WORLD-housing-hearing-without-judge, SG-WORLD-housing-counted-rent. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/housing.ts

**Notes.** First row: All of a town's rentals belong to one landlord business with no owner; it serves notice by summed pulls of months owed and months late (calibrated to landlords filing at about two months owed), not by an owner's own pati
