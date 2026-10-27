---
id: words-purpose-scenes-count-no-scene-maysville
title: "purpose-scenes fails on main for seed b192e3dbed748f0f: a council count in Maysville, North Carolina fires no scene"
area: words
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/director/purpose-scenes.test.ts fails on main with GOLDEN_PATH_SEED=b192e3dbed748f0f, as it does on branches that merge main. On its third draw, Maysville, North Carolina (3742100), the filer behind filing:contest:seat:gus2025:131738:council:0:2025-11-04:person_04962cc79c8da140 has no scene for the November 4, 2025 count: the test's check "the count fired no scene" finds no schedule entry for the election-result record. The test draws its place at random, so this turns CI red on any director change whose run lands on it. The cause is not yet known: the count's moment may be missing, unbound, or held by the month's repeat window.

**Rules.** Ask why: the fix names the cause by record (the moment, its schedule entry and the binding's failure) before changing anything. One rule, all 56 places: no place-specific branch in the director or the test. No dice: nothing decides the outcome but records.

**Done when.** src/director/purpose-scenes.test.ts passes on seed b192e3dbed748f0f and on three fresh seeds the builder did not choose, run in the played world (buildBenchWorld), with the cause of the Maysville miss named by record id in the PR body, and either the director fixed or the test's expectation corrected to what the records say.

**Files.** src/director/purpose-scenes.test.ts, src/director/scheduling.ts

**Notes.** TODO
