---
id: words-played-talks-on-their-day
title: "The fifteen-talk proof opens each talk on its scene's day, not after the year"
area: words
kind: bug
priority: 2
size: S
status: claimed
claimed-by: words/played-talks-on-their-day
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-23T22:58:32.044Z
---

**What.** The fifteen-talk proof in src/director/played-talks.test.ts opens every staged talk only after the bench's year has run. So a talk staged in April reads what the two people know at the end of the year: on Clintwood, Virginia, seed 8d2617a72f26034f:1, a new-baby talk staged on 2025-04-11 cited a news story read on 2026-01-14. In play a talk opens on its scene's day. The bench's staging loop already composes each scene on its day, so it should hand each staged scene to an optional callback, and the test should open and play the talk there before the world moves on. Every talk that counts should then be checked, not only the fifteen it names.

**Rules.** Wire to the world: the talks are played in the bench's world on the day the director stages them, so each reads that day's records and the rest of the year reads what was said. Ask why: the odd record date in the proof was traced to the test opening talks after the year, and the fix removes that cause.

**Done when.** In a played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, played-talks.test.ts opens each talk on the day its scene is staged, names each talk's date beside its moment and record ids, and checks every talk that counts, not only the fifteen named.

**Files.** src/director/played-talks.test.ts, scripts/dialogue-batch/stage-world.ts

**Notes.** TODO
