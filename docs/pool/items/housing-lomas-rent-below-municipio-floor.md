---
id: housing-lomas-rent-below-municipio-floor
title: "Lomas, Puerto Rico median rent sits about 1% under its state's lowest municipio median"
area: world
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** After the town reads its own municipio (Canóvanas, 72029, median rent 568), the town's median rent at the start of the year is 345.03 against a floor of 349 in the state's county medians (seed 591a7dea70e8601ff33ba68cdc050acfd4eee1b0b96f73c00c9606d9e7decf31, place key 7246626, m1-05-check). The lookup is right; the scaling of rent by household income puts the renters' median below the county median. Find whether the income scaling or the renter median is what the check should accept, with the cause by record.

**Rules.** No dice; research calibrates, never decides an outcome. One rule, all 56 places: no place named in logic.

**Done when.** m1-05-check for the place above passes its rent clause with the cause named, or the clause is changed with the owner's reading line.

**Files.** src/core2/modules/housing.ts, src/core2/tooling/m1-05-check.ts

**Notes.** TODO
