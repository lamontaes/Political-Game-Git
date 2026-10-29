---
id: director-scene-talk-job-offer-skipped
title: "scene-talk.test is red on main: the job-offer purpose is skipped instead of composed"
area: director
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
lead: director
source: added with npm run pool -- add
claimed-at:
---

**What.** src/director/scene-talk.test.ts fails three tests on clean main at a86a3ea0c6 (seed scene-talk-test): composes every purpose, plays every purpose in play, and composes a tree all stop at job-offer: expected skipped to be composed. Every purpose type after job-offer in situation-types.json goes unchecked while it stays red, so a later type's broken words would not show. Stopgap SG-DIR-job-offer-lines in src/core2/data/stopgaps.json named the cause as the missing job-offer lines and is now marked resolved there. A helper ran src/director/scene-talk.test.ts on current main with seed scene-talk-test on Oct 29 and all 8 tests passed, so this item may already be done.

**Rules.** Fix at the root: the reason composeSceneTalk gives for skipping job-offer names the missing piece or fact; supply the fact the purpose needs or route the missing line to the words lead, never skip the type in the test. No hand-written player text: the job-offer narration and lines come from the scene-talk bank in data/english, never from code.

**Done when.** src/director/scene-talk.test.ts passes on main with every purpose type composed, and the PR body names the skip reason it fixed and the type or piece that caused it, with the test output as evidence.

**Files.** src/director/scene-talk.test.ts, src/director/data/situation-types.json, src/director/purpose-scene.ts

**Notes.** TODO

**Notes.** Twin of `words-job-offer-scene-lines`: the skip is the missing job-offer narration and lines (stopgap SG-DIR-job-offer-lines), which that item writes. Dropped into it, with this evidence, Oct 28.
