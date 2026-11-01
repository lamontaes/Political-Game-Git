---
id: core-long-run-forgetting-queue
title: "Forget old event notes from a list filed by day"
area: core
kind: bug
priority: 1
size: S
status: claimed
claimed-by: speed/cut-forget-queue
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-01T18:51:40.045Z
---

**What.** Once a month the game reread every memory of every person, the dead included, to forget old event notes. In the four-year Ringgold run that monthly reread grew from about 0.13 seconds to 0.76 seconds. In a long save that pass alone grows with every person who ever lived in the world. Part of core-long-run-tables-grow-with-history.

**Rules.** Speed: a country's year runs under 120 seconds, and years 97 to 100 of a save run at most 1.2 times years 1 to 4; never scan the whole world or its history every day. A speed change never changes what the simulation decides: dev mode's records proof must be identical before and after on a drawn place.

**Done when.** The monthly pass looks only at notes old enough to forget and forgets the same notes on the same dates. The four-year proof matches main on every table except the new saved list; npm run speed:year -- --seed long-1 --years 4 on main and on the branch, one process each, keeps dev mode's records proof identical in every table of the played world at year 4 in the played world (buildBenchWorld), the tests the PR names pass, with the times in the PR body.

**Files.** src/core2/knowledge-retention.test.ts, src/core2/knowledge-retention.ts, src/core2/snapshot.ts, src/core2/state.ts

**Notes.** TODO
