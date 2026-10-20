---
id: world-other-places-coarse-population
title: "Every other place keeps a coarse population (counts by age, household, job and pay) so a person met there can be filled in from it"
area: world
kind: feature
priority: 2
size: L
status: claimed
claimed-by: claude/other-places-coarse
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T05:44:10.336Z
---

**What.** Only the player's town has counted people. A president who visits another town (SG-OFFICE-FED-trip-residents), a relative who lives elsewhere, a candidate from another district and any person the player meets outside the town are identities with no household, job or pay in that place. Keep each other place coarse, as the owner's Oct 11 two-level rule says: counts by age, household type, occupation and pay band from the same census tables buildPopulation already reads, held per place and stepped by the regional economy, not a second simulation. A person met there is filled in from those counts by the same fill-in rule as the player's town, matching the counts (a place whose counts show 12 bakers has a baker with the pay the counts say).

**Rules.** One model, two tiers: the same rule reads a counted group and a full person. Speed: counts are indexed and filled in only when the player meets someone; never scan every place daily. No dice: who is met follows the counts and the visit, never a roll. One rule, all 56 places: no place named in code. Replace, never layer: the trip identities drawn from the world seed are deleted.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a place drawn from all 56 with a seed the builder did not choose, a president's trip to another drawn town meets a resident with a household, job and pay that match that town's counts, shown by person and place record ids; SG-OFFICE-FED-trip-residents closes in stopgaps.json; a test beside src/core2/office-day-federal.test.ts names the places and the seed.

**Files.** src/core2/modules/residents.ts, src/core2/modules/regional.ts, src/core2/office-day-federal-president.ts, src/core2/data/stopgaps.json

**Notes.** Found Oct 20 (claude/political-game-pool-yucp92-uu) while claiming office-stopgap-office-day-federal-president-missing-record: the regional module holds economy factors per region but no people, so there is nothing to fill a met person in from. Check docs/design/core2-porting-plan.md and DECISION-REGISTER.md first.
