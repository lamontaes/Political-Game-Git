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

**What.** src/director/scene-talk.test.ts, 'composes every purpose', fails on GOLDEN_PATH_SEED=041a8d22aeee on clean main: the apology scene's lines are leave, confront and a narrator reaction, with no line that apologizes (expected false to be true). Found by Merger 2 on Oct 27 while gating PR 6312; it fails the same on origin/main. A helper reran it on current main on Oct 29: 7 of the file's 8 tests pass and this one still fails at src/director/scene-talk.test.ts line 167, because the scene's last spoken line is the asked side's confront and the talk records no gap saying a question was left unasked. In src/director/data/situation-types.json the apology type's asker is the wronged side and its asked side is the apologizing role, whose moves include apologize, so the cause is either a bank with no apologizing line for this cast or a cast that never reaches that move, and which one is not yet known.

**Rules.** One rule, all 56 places: reproduce on the seed and one fresh drawn seed and name the place and seed. Never skip or narrow the test to get green.

**Done when.** scene-talk.test.ts passes on GOLDEN_PATH_SEED=041a8d22aeee and on a fresh drawn seed, with the cause named by file and line and the bank or the scene's cast corrected, shown by the test failing before and passing after.

**Files.** src/director/scene-talk.test.ts

**Notes.** TODO
