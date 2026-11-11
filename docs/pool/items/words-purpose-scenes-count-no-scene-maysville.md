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
after:
standard: 2
model: sonnet
effort: medium
root: rc6-scenes-repeat
lead: director
checked: fable 2026-11-10
---

**What.** src/director/purpose-scenes.test.ts fails on main with GOLDEN_PATH_SEED=b192e3dbed748f0f, as it does on branches that merge main. On its third draw, Maysville, North Carolina (3742100), the filer behind filing:contest:seat:gus2025:131738:council:0:2025-11-04:person_04962cc79c8da140 has no scene for the November 4, 2025 count: the test's check "the count fired no scene" finds no schedule entry for the election-result record. The test draws its place at random, so this turns CI red on any director change whose run lands on it. The cause is not yet known: the count's moment may be missing, unbound, or held by the month's repeat window. Guards: the purpose-scene test on main; a council count in this town fires no scene.

**Cause.** Needs cause. Looked at the item only: GOLDEN_PATH_SEED=b192e3dbed748f0f, third draw Maysville, North Carolina (3742100), src/director/purpose-scenes.test.ts finds no schedule entry for the election-result record of the November 4, 2025 count (filing:contest:seat:gus2025:131738:council:0:2025-11-04:person_04962cc79c8da140); whether the moment is missing, unbound, or held by the monthly repeat window in src/director/scheduling.ts is not found.

**Fix.** None until the cause is found.

**Time box.** 3 hours for one Sonnet session, to find the cause by record (the moment, its schedule entry and the binding's failure) and rewrite this item with Found in code and a real Fix.

**Rules.** Ask why: the cause is named by record before anything is changed. One rule, all 56 places: no place-specific branch in the director or the test. No dice: nothing decides the outcome but records.

**Done when.** A second session, not the builder, reads the rewritten item and finds the Maysville miss named by record id with a Fix in plain words, then runs src/director/purpose-scenes.test.ts at seed b192e3dbed748f0f and on three fresh draws (place and seed named) in the played world (buildBenchWorld) and sees it pass.

**Waits on.** Nothing.

**Files.** src/director/purpose-scenes.test.ts, src/director/scheduling.ts

**Notes.** TODO

**Notes (re-run, 2026-11-10, main b4422d346c).** npx vitest run src/director/purpose-scenes.test.ts --maxWorkers=1 with OCD_STORAGE_OVERRIDE and NODE_OPTIONS=--max-old-space-size=8192, GOLDEN_PATH_SEED=b192e3dbed748f0f: 1 of 1 passed (green on the item's own seed). Fresh draw GOLDEN_PATH_SEED=sweep-fresh-13897: red, a different assertion from the item's. As printed: `AssertionError: Paradise, Kansas (2054325), seed sweep-fresh-13897:0: filing:contest:seat:gus2025:126960:council:0:2025-11-04:person_6ebdcf651eaa02b8: expected 'council member' to be 'Council member'`. Still red by draw.
