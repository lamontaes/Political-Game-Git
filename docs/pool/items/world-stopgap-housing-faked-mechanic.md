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

**What.** The stopgap row(s) SG-WORLD-housing-landlord, SG-WORLD-housing-hearing-without-judge, SG-WORLD-housing-counted-rent in src/core2/modules/housing.ts mark a shortcut that is still live in play. Today all of a town's rentals belong to one ownerless landlord that serves notice by summed pulls calibrated to about two months owed, eviction hearings run without a judge, and counted renters' rent has a stand-in. The row stays open until the real mechanic replaces the fake, or the feature that needs the fake is deleted. This item replaces it and clears the row in src/core2/data/stopgaps.json.

**Rules.** No dice: a landlord files because of their own patience, money and the law's steps, never a calibrated pull alone. One model, two tiers: counted renters pay and are evicted under the same rule as full ones. Replace, never layer: the fake is deleted in the same change, and a row is never closed by deleting it without the mechanic. Numbers go in the parameter table tagged SOURCED, ESTIMATED or TUNABLE.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56, the seed and place named in the PR body), an eviction is filed by a named landlord, heard by a named judge and ends a named household's lease, with landlord, hearing and lease record ids, named by record id. The test in src/core2/housing.test.ts and the stopgap tripwire test show the row resolved in stopgaps.json. The owner plays it: fall behind on rent and see a named landlord and a judge decide.

**Files.** src/core2/modules/housing.ts, src/core2/data/stopgaps.json, src/core2/housing.test.ts

**Notes.** First row: All of a town's rentals belong to one landlord business with no owner; it serves notice by summed pulls of months owed and months late (calibrated to landlords filing at about two months owed), not by an owner's own pati
