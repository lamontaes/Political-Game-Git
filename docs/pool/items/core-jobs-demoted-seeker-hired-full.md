---
id: core-jobs-demoted-seeker-hired-full
title: "A person returned to the counts is hired onto a full record and the press crashes filling them in (Anon Raices, Puerto Rico, seed 1977d40995, February 9 of the second year)"
area: world
kind: bug
priority: 1
size: S
status: claimed
claimed-by: claude/jobs-demoted-seeker
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T09:12:32.359Z
---

**What.** A person who was looking for work when their household drifted back into the counts keeps a full job-seeker row, and the weekly matching hires them onto a full record in the jobs table while the record is still demoted. The press staff pass then tries to fill that person in, the relocation refuses (they hold a live job), and the whole run stops with "Invalid relocation: one living household, no job held" on February 9, 2026 in Anon Raices, Puerto Rico (seed 1977d40995), after the person was hired as an editor of the town paper on February 2. A demoted person's work belongs to the counts, as every other counted worker's does.

**Rules.** One model, two tiers: a counted person looks for work, is offered a job and answers by the same reasons a full person does, through the counted path, never as a full person with a counted record. No dice: who is hired comes from fit and pay.

**Done when.** In the played world (`buildBenchWorld`, seed 1977d40995, Anon Raices, Puerto Rico) three game years run with no crash, and a test in a drawn place shows a person returned to the counts who is looking for work is moved to the counted seekers and holds no live job on a full record afterward.

**Files.** src/core2/modules/jobs.ts, src/core2/jobs-demoted-seeker.test.ts

**Notes.** Found while checking year two of world-hires-below-jolts. The year-one rates are unchanged by this fix.
