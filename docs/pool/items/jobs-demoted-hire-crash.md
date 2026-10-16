---
id: jobs-demoted-hire-crash
title: "A year stops when the jobs engine hires a person who was returned to the counts (DeWitt, New York)"
area: world
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: claude/press-fillin
pr: #4754
blocked-on:
source: "found by a scan of 40 random places for a year-run crash"
---

**What.** In DeWitt, New York (seed 5b37bfc175) the year stopped on January 12, 2026 with "Invalid relocation: one living household, no job held." when the press's staff refresh tried to fill a person in. Residents the player has lost touch with go back to the counts and keep a record on the inactive tier; the jobs engine treated such a person as a full person (a record in the people table) and hired them with a full job, so they were counted and held a full job at once. Four such people held jobs hired on December 1, 2025 and January 1, 2026. Now a person returned to the counts is counted in the jobs engine too, so they are hired as a counted worker, and the full seeker list skips them until they are filled in again.

**Rules.** One model, two tiers: a counted person is hired by the counted rule even when a record of them is kept. No dice. Wire to the world: the press's refresh and every fill-in read one book per job.

**Done when.** In a played world (buildBenchWorld, the named place and seed, DeWitt, New York, seed 5b37bfc175) the year runs to its end, and a test in src/core2/jobs-demoted-hire.test.ts checks that no person in the counts holds an active full job.

**Files.** src/core2/modules/jobs.ts, src/core2/jobs-demoted-hire.test.ts

**Notes.** Reproduced with the same 30-day legs the scan used; fixed in place, the year runs. Two failures in 40 places were found by the scan; the other is finance-retirement-group-keeps-dead-child.
