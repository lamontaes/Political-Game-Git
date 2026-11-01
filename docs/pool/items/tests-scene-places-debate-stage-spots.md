---
id: tests-scene-places-debate-stage-spots
title: "scene-places.test.ts: the debate stage has two spots where the test wants three"
area: play
kind: bug
priority: 2
size: S
status: done
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/bench/scene-places.test.ts 'every painted place can hold people' fails on main (Oct 28): 'debate-stage: expected 2 to be greater than or equal to 3'. The debate stage's staging carries two spots. The test reads art/backdrops/staging.json and requires every painted place to hold at least three spots and exactly one hero spot. A helper found on Oct 29 that the debate-stage row now holds 29 spots, including two candidate podiums, and that the whole file passes 4 of 4 on main, so the item looks already done.

**Rules.** Fix the staging data or the picture, never the test's floor. Replace, never layer: the debate stage's staging row is corrected in place in art/backdrops/staging.json, not covered by a second staging file beside it.

**Done when.** scene-places.test.ts passes on main with the debate stage holding at least three spots, shown in a screenshot of a debate with its candidates and moderator placed.

**Files.** src/bench/scene-places.test.ts, art/backdrops

**Notes.** TODO
