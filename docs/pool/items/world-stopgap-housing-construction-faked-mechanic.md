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

**What.** The stopgap row(s) SG-WORLD-housing-new-home-buyers in src/core2/housing-construction.ts mark a shortcut that is still live in play. Today new houses sell only to full renter households, and counted renters and households moving in never buy one, so unsold houses pile up. The row stays open until the real mechanic replaces the fake, or the feature that needs the fake is deleted. This item replaces it and clears the row in src/core2/data/stopgaps.json.

**Rules.** One model, two tiers: counted renters and arriving households buy under the same affordability rule as full ones. Sliding scales and causes: buying follows income, savings and price. Replace, never layer: the fake is deleted in the same change, and a row is never closed by deleting it without the mechanic. Numbers go in the parameter table tagged SOURCED, ESTIMATED or TUNABLE.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56, the seed and place named in the PR body), a new house is bought by a counted renter or an arriving household and the sale appears on the closing record, with the house and household record ids, named by record id. The test in src/core2/housing-construction.test.ts and the stopgap tripwire test show the row resolved in stopgaps.json. The owner plays it: watch new houses sell to families who moved in.

**Files.** src/core2/housing-construction.ts, src/core2/data/stopgaps.json, src/core2/housing-construction.test.ts

**Notes.** First row: New houses sell only to full renter households; counted renters and households moving in never buy one, so unsold houses pile up.
