---
id: people-player-meets-coworkers-at-job
title: "The player meets coworkers when they take a job"
area: people
kind: wiring
priority: 2
size: S
status: claimed
standard: 2
claimed-by: claude/project-thread-x61cvt
pr:
after:
blocked-on:
lead: people
model: sonnet
effort: medium
root: none
source: added with npm run pool -- add
claimed-at: 2026-11-13T04:15:38.511Z
---

**What.** When the player takes a job, the people they work beside become people they know and see on People. Today the hire meets only coworkers who are already full people (fullJobs in src/core2/modules/jobs.ts, the meetAtWork call near line 4813); coworkers who are only counted in the business's books are never filled in, so a small shop can show the player an empty People list. Fill in the counted coworkers nearest first (same role, then the rest) from the business's own books, matching job and pay, up to the number meetAtWork lets one know. Seen: the player's new coworkers on the People screen after taking a job. Feeds: core-stopgap-encounters-behavior-model-gap

**Cause.** Found in code: src/core2/modules/jobs.ts:4707 builds coworkerIds from fullJobs(api, position.organizationId), which lists only full people, and passes them to meetAtWork (src/core2/encounters.ts:117); counted workers of the same employer are not in that list. Split from core-stopgap-encounters-behavior-model-gap (CTO, Nov 13).

**Fix.** In the hire path, when the hire is the player, fill in counted coworkers of the employer through the existing fill-in (two-level population, state.ts) until meetAtWork's room is used, each matching the books' role and pay, then meet them with meetAtWork. No new engine, no dice; the number met stays the one knownAmong gives.

**Time box.** 4 hours

**Rules.** Two-level population (fill in only on meeting, match the records); no dice; one engine per mechanic; wire to the world; every number in a parameter table.

**Done when.** A second session starts a life in a drawn place (place and seed named), takes a job at an employer with counted staff, and finds the coworkers on People with the met fact source job-change:<date>:<job id>:hire by record id; each filled-in coworker matches the books' role and pay. A test requires at least one previously counted coworker to be met.

**Waits on.** Nothing.

**Files.** src/core2/modules/jobs.ts, src/core2/encounters.ts, src/core2/state.ts
