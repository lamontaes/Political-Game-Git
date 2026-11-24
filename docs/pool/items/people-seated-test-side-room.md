---
id: people-seated-test-side-room
title: "Main red: the seated test ignores the room kept at the picture's sides"
area: people
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/people-seated-side-room
pr: #6547
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T05:52:16.656Z
---

**What.** src/bench/seated.test.ts fails on main for any room with a seat near a side (PEOPLE_TEST_PLACE=county-courtroom): since #6427 a figure keeps SIDE_ROOM (4%) at either side, and the test still expects the clamp at the picture's edge.

**Rules.** Fix at the root; never skip a test; one number in one place.

**Done when.** The seated test passes for every staged room with a seat (194, each run by PEOPLE_TEST_PLACE), reading SIDE_ROOM from whole-figures.ts instead of a second number.

**Files.** src/bench/seated.test.ts, src/bench/whole-figures.ts

**Notes.** TODO

Oct 29 (CTO): set done; PR #6547 merged (the done flip failed while branch protection refused the flip job's push).
