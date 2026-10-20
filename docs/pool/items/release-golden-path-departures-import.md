---
id: release-golden-path-departures-import
title: "The played-world golden-path spec (M0-13) fails on every PR: it imports departuresOf, which PR 5366 deleted"
area: release
kind: bug
priority: 1
size: S
status: claimed
claimed-by: claude/golden-path-departures
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T09:37:10.041Z
---

**What.** tests/golden-path/played-world.node-test.ts imports departuresOf from src/core2/modules/moves, which the moves departures-table deletion (PR 5366) removed, so spec M0-13 fails at import in 5.7 seconds on every PR (seen on 5271 in Playa Fortuna, Puerto Rico, seed 394443325193929b…). The test should watch the moved-away event with watchDepartures(core) and read departuresSeen(core).

**Rules.** Replace, never layer: use the test-only watcher that replaced the table; no second reader. Ask why: name the place and seed.

**Done when.** M0-13 passes in Playa Fortuna, Puerto Rico (seed 394443325193929bc4b531ac5eee0df8e26a74c4eb855f305478ef52fcee905a) and the departures check reads 40 departures through the watcher; shown by running tests/golden-path/played-world.node-test.ts with --expose-gc.

**Files.** tests/golden-path/played-world.node-test.ts

**Notes.** TODO
