---
id: core-old-imports-opening-work
title: "The opening's work schedules come from the core, not the old work-schedules code"
area: core
kind: cleanup
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
after: core-old-imports-opening-employment
source: added with npm run pool -- add
claimed-at:
---

**What.** `src/core2/opening-work.ts` builds each opening job's weekly schedule by calling `workSchedulesFor` and `WORK_PATTERNS` in `src/simulation/living-world/work-schedules.ts`, which works the pattern out from the old world's work relationships, roles, organization keys and rosters. Replace it with a core schedule builder: the working-week patterns (office, school, store, diner, hospital, police, fire and the rest) move to a core data file, a job's pattern comes from its workplace and title in the opening's own job and organization records, and staff of one employer take turns on the shifts. The builder already has `scheduleAtHours`, which builds a pattern at a job's full-time or part-time hours; it becomes the only path, so a job's scheduled weekly minutes also match the hours the job states.

**Rules.** Replace, never layer: `workSchedulesFor` stops being imported by the opening and the pattern table moves, not copies. Every number is a tagged parameter with its spread (the old file marks every timetable a GAME ASSUMPTION; keep that tag). One rule, all 56 places: the patterns are data by kind of work, with no place named.

**Done when.** In a drawn place from all 56 (name and seed in the PR body, `buildBenchWorld`) `opening-work.ts` imports nothing from `src/simulation`, every opening job's scheduled weekly minutes are within a tenth of its stated `hoursDaily` times the days of its working week, the same people work the same employers by record id, and a test in src/core2 names the place and seed. The pool item world-opening-schedules-run-over-job-hours is closed by the same change.

**Files.** src/core2/opening-work.ts, src/core2/data/work-patterns/, src/core2/population.ts

**Notes.** Written Oct 18 from the file (it was a placeholder). Runs after core-old-imports-opening-employment, which gives each job its workplace. The schedule gap (opening schedules run 40 to 48 hours against 40 stated) was measured in the Oct 17 pool item world-opening-schedules-run-over-job-hours.
