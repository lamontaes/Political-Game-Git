---
id: core-jobs-demoted-seeker-hired-full
title: "A person returned to the counts is hired onto a full record and the press crashes filling them in (Anon Raices, Puerto Rico, seed 1977d40995, February 9 of the second year)"
area: world
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/jobs-demoted-seeker
pr: #4665
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T17:10:19.385Z
---

**What.** A person returned to the counts is later hired onto a full record, and the press crashes filling them in (Anon Raices, Puerto Rico). The jobs engine hires a job seeker who was demoted to the counted population as if they were still a full person, so the record the hire writes does not match the counted one. Make the hire fill the person in first, or hire onto the counted record, so the press staff refresh finds a consistent person.

**Rules.** One model, two tiers: a counted person is read with the same rule as a full person, times their count, and a filled-in person must match what the records already say. Replace, never layer: fix the hire in place rather than catching the crash in the press refresh.

**Done when.** In a one-year run of the played world (buildBenchWorld) in Anon Raices, Puerto Rico and a drawn place with a seed the builder did not choose, a demoted job seeker who is hired has one consistent record by person and job record id, the press staff refresh runs without a stop, and a test in src/core2 proves it.

**Files.** src/core2/modules/jobs.ts, src/core2/modules/residents.ts, src/core2/modules/press.ts

**Notes.** Written from the title and the sent-back note when the quality gate was repaired (Oct 16).
