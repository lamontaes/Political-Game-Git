---
id: jobs-layoff-ended-job-crash
title: "reviewEmployers throws 'Only a current recorded job can end' on a layoff after officials are imprisoned (seed ce7a4fce5dcd8334, July 2026)"
area: world
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/layoff-ended-job
pr: #4621
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T04:58:18.323Z
---

**What.** The jobs engine's monthly employer review (`reviewEmployers`, jobs.ts) throws in `layOff` (jobs.ts near 1046): `api.endJob` finds no current recorded job for the id (`endRecordedJob`, job-lifecycle.ts:85). A job picked from the employer's staff is not a current record in `core.jobs`. Possible cause (not confirmed): a counted job whose worker was filled in since the staff list was built, so `isCounted` is false while the job still lives only in the counted books. The world stops the day it throws.

**Rules.** Ask why; no dice; an effect is a read; one model, two tiers.

**Done when.** The seed below runs 18 months past the convictions without throwing, the cause is named by job and person record id, and a test in a random place covers it.

**Files.** src/core2/modules/jobs.ts, src/core2/job-lifecycle.ts, src/core2/residents-economy.ts

**Notes.** Found while testing bribe forfeiture (gov-forfeiture-of-the-bribe-at-sentencing-sg). Reproduce: `buildBenchWorld("ce7a4fce5dcd8334", gameStartDate(), { twoLevel: true })`, then 12 sitting officials each get a 50,000,000-minor bribe offer from the 15 richest non-officials (`considerBribe`), then `advanceCore` for two years: six people are convicted and imprisoned by March 2025 (the vice president, the DC mayor and the DC House member among them) and the throw comes on 2026-07-01. Not shown to come from forfeiture (the change only moves cash at sentencing); not run on a world without the forced bribes.
