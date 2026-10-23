---
id: core-old-imports-opening-people
title: "Move the opening people builder off the old citizenship, life, appearance and world code"
area: core
kind: cleanup
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
after: core-old-imports-population
source: split from core-old-imports-opening-builders by pool feeder Oct 20
---

**What.** `src/core2/opening-people.ts` writes the opening's people (names, birth, home, household) but still imports six old modules: `citizenship-creation`, `history-index`, `life` (`startHouseholdMembership`), `life-queries` (`householdLocationAt`, `householdMembershipsAt`), `person-appearance` and `world` (`assertWorldIntegrity`), plus the old `Person`, `PersonFact`, `PersonIdentity` and `World` types. Write the household membership, citizenship start and appearance lineage fresh as core records, port only what the opening reads, and delete the old imports from this file in the same change. The opening must build the same people by record id afterward.

**Rules.** Replace, never layer: each old import is deleted when its replacement lands, and the PR body counts what was removed. Build only what the golden path needs: port the small part the opening uses, not the old module. One rule, all 56 places: citizenship and household facts come from place data with no place named in code. One model, two tiers: counted people get the same household and citizenship facts as full ones. Same town by record id for a drawn place before and after.

**Done when.** In a one-year run of the played world (`buildBenchWorld`) in a place drawn from all 56 with a seed the builder did not choose (both named in the PR body), the opening builds the same people, households and citizenship records by record id as before the change, `grep -n 'simulation/' src/core2/opening-people.ts` prints nothing, and src/core2/opening-key-people.test.ts and src/core2/population.test.ts pass.

**Files.** src/core2/opening-people.ts, src/core2/opening-key-people.test.ts, src/core2/population.test.ts

**Notes.** Found by the pool feeder: the roll-up grep still lists this file, and no existing child covers it.
