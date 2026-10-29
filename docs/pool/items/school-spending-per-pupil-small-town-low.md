---
id: school-spending-per-pupil-small-town-low
title: "The school test fails in a small Kentucky town: spending per student comes to $987 against the test's $3,000 floor"
area: people
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/school-spending-pupil
pr: #6337
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-27T14:23:41.917Z
---

**What.** src/core2/school-outcomes.test.ts ('decides tests and graduation from the place's base, its web factor and each student's standing') requires the town's school spending record to lie between $3,000 and $60,000 a student. On clean main 0fe88e7375 with SCHOOL_SEED=d12e2e3dd77853bd it draws Summer Shade, Kentucky (US-KY) and the spending record's value is 987.2, so the test fails: 'expected 987.203720140908 to be greater than 3000'. Every state's real spending per student is above $9,000 (Census Annual Survey of School System Finances), so either the record divides the town's schools lines by the wrong count of students or the lines leave out a district's money.

**Rules.** Estimate, never UNKNOWN: a figure a player can see starts from the real average with a per-world spread. One rule, all 56 places: the same reader in every place. Research before building: the band comes from the Census survey of school finances.

**Done when.** The spending record in Summer Shade, Kentucky (seed d12e2e3dd77853bd) and three fresh drawn places named in the PR body lies inside the sourced band, with the cause of the low value named by file and line; school-outcomes.test.ts passes on those seeds. **On screen.** None by design: this is a check, a speed or tooling change, or a cleanup; the player notices only that the game keeps running and the numbers stay believable.

**Time box.** 3 hours, Sonnet, no helpers; builds against nothing.

**Files.** src/core2/school-outcomes.ts, src/core2/school-budget-line.ts, src/core2/school-outcomes.test.ts

**Notes.** TODO
