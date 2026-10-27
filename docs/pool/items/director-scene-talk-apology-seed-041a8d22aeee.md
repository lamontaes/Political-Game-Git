---
id: director-scene-talk-apology-seed-041a8d22aeee
title: "scene-talk.test.ts fails on seed 041a8d22aeee: the apology purpose composes no apology line"
area: director
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/director/scene-talk.test.ts, 'composes every purpose', fails on GOLDEN_PATH_SEED=041a8d22aeee on clean main: the apology scene's lines are leave, confront and a narrator reaction, with no line that apologizes (expected false to be true). Found by Merger 2 on Oct 27 while gating PR 6312; it fails the same on origin/main.

**Rules.** One rule, all 56 places: reproduce on the seed and one fresh drawn seed and name the place and seed. Never skip or narrow the test to get green.

**Done when.** scene-talk.test.ts passes on GOLDEN_PATH_SEED=041a8d22aeee and on a fresh drawn seed, with the cause named by file and line and the bank or the scene's cast corrected, shown by the test failing before and passing after.

**Files.** src/director/scene-talk.test.ts

**Notes.** TODO
