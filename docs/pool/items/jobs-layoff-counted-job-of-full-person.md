---
id: jobs-layoff-counted-job-of-full-person
title: "A year crashes in layOff: a counted job of a person who is now a full person is ended as a full job (Dorset, Vermont)"
area: world
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/jobs-layoff-counted
pr: #4541
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-15T23:58:32.463Z
---

**What.** A plain year (the player does nothing) in Dorset, Vermont stops with "Only a current recorded job can end" on November 1, 2025. `layOff` in `src/core2/modules/jobs.ts` picks the job `work-relationship_6eb8bc851a5819cb:counted:2025-11-01` from `currentJobs`, which includes counted jobs from the residents' books. It decides whether the job is counted by asking whether its worker is missing from `core.people`, but the worker is a full person by then while the job row still lives only in the counted books, so `api.endJob` looks it up in `core.jobs` and throws. Decide counted-ness from where the job row lives, and find why a filled-in person's counted job stayed in the counted books when fill-in is supposed to move it to `core.jobs`.

**Rules.** An effect is a read, not a record: the layoff must end the job row the wage flow pays, so the paycheck stops. One model, two tiers: a counted worker and a full worker are laid off by the same rule. Replace, never layer: one place decides which book a job is in, not two.

**Done when.** In a played world (`buildBenchWorld`, the place `drawPlace("s3", "bg-chain")`, seed `c23f0b6bb40a7005b7a409173f34051beae98737968ab4cf921d68ea6c0e6e62`, Dorset, Vermont, from the game start date) a 365-day run completes with the layoff on November 1, 2025 ending that job and its wage flow, named by the job id. A test in src/core2/jobs.test.ts or a new src/core2 test runs the year in a drawn place and fails on the old code. The owner plays it: skip a year in any town and it does not stop.

**Files.** src/core2/modules/jobs.ts, src/core2/residents-economy.ts, src/core2/modules/residents.ts

**Notes.** Reproduced with /tmp/bg.ts-style script: advanceCore day by day from gameStartDate for 365 days on that seed. Debug print at the throw: jobId `work-relationship_6eb8bc851a5819cb:counted:2025-11-01`, sourceId `jobs:layoff:2025-11-01`, `core.jobs.get(jobId)` undefined.
