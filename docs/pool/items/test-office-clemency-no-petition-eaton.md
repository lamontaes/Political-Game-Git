---
id: test-office-clemency-no-petition-eaton
title: "office-day-clemency.test fails on main in Eaton, Indiana (seed 4434416becb2dc1d): no petition on the review day"
area: gov
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/clemency-eaton
pr: #5779
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-21T05:35:32.279Z
---

**What.** The test src/core2/office-day-clemency.test.ts draws a place and expects one clemency petition on the governor's review day. With OFFICE_CLEMENCY_SEED=4434416becb2dc1d it draws Eaton, Indiana (key 1820080) and finds none: expected 1, received 0 at the entries.length assertion. It fails the same on clean main and on the corruption calibration branch, so it is not from that change. Find why no petition was filed in that world, whether the prisoner pool or the filing step is empty, and fix the cause or the test's draw.

**Rules.** One rule, all 56 places: the test draws places and names them; the fix names no place. No dice. Wire to the world: the proof is a played world.

**Done when.** OFFICE_CLEMENCY_SEED=4434416becb2dc1d passes src/core2/office-day-clemency.test.ts, and a random draw passes in the test run; the cause is named in the PR body with the place, seed and record ids.

**Files.** src/core2/office-day-clemency.test.ts

**Notes.** TODO
