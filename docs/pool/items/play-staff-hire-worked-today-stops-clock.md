---
id: play-staff-hire-worked-today-stops-clock
title: "A staff review under the player's clock stops the game: it hires someone who already worked today and ends their job in calendar work"
area: gov
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: claude/staff-worked-today
pr: #5361
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T00:54:48.818Z
---

**What.** With the player controlling a council member, the player's clock runs calendar work at the close of the day, after the day's work, and the staff engine's review hired a person who had already worked that day (hireStaff, then startPublicJob, which ends their old job), so endRecordedJob threw 'A job ends before its day's work, from calendar work' and the clock stopped on 22 January 2025 in Gardiner, Montana (seed 4d18b465, a council member as the player). The executive engine already skips anyone who worked today when it picks a department head (workedToday in executive.ts). Move that helper into job-lifecycle and have the staff candidates skip such people too, so they are considered the next day.

**Rules.** No dice: the skip follows the person's recorded attendance that day, never a roll; Replace, never layer: the executive's private copy of workedToday is deleted and both engines read the one in job-lifecycle; One rule, all 56 places: nothing names a place.

**Done when.** In a played world (buildBenchWorld) in a place drawn from all 56 with a seed the builder did not choose, named in the PR body, a council member controlled by the player lives 120 days without the clock stopping, and a test in src/core2/staff.test.ts shows a person who worked today is not a staff candidate that day and is one the next.

**Files.** src/core2/job-lifecycle.ts, src/core2/modules/staff.ts, src/core2/modules/executive.ts

**Notes.** TODO
