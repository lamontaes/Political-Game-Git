---
id: tests-scene-places-debate-stage-spots
title: "scene-places.test.ts: the debate stage has two spots where the test wants three"
area: play
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/bench/scene-places.test.ts 'every painted place can hold people' fails on main (Oct 28): 'debate-stage: expected 2 to be greater than or equal to 3'. The debate stage's staging carries two spots.

**Rules.** Fix the staging data or the picture, never the test's floor.

**Done when.** scene-places.test.ts passes on main with the debate stage holding at least three spots, shown in a screenshot of a debate with its candidates and moderator placed.

**Files.** src/bench/scene-places.test.ts, art/backdrops

**Notes.** TODO
