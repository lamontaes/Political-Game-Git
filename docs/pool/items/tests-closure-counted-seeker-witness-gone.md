---
id: tests-closure-counted-seeker-witness-gone
title: "The counted-seeker closure test finds no uncoded counted hire in Traskwood any more, so it fails on main"
area: world
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr: #6013
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** src/core2/closure-counted-seeker-finite.test.ts (PR #5981) plays Traskwood, Arkansas (0569830), seed c2-b, a month at a time for up to two years until a counted worker is hired from a job with no occupation code, then checks the job can be copied into a closure seeker row. On main at 8e01a3dfab it reaches 2027-01-10 with no such hire and fails 'no counted job without an occupation code: expected 0 to be greater than 0' (measured, 232 s). Merges after #5981 that change hiring (#5983 credit draws, #4937 living-cost arrears) moved the one radio-station hire it waited for. The test depends on one town's hire timing, so any hiring change can break it.

**Rules.** Never loosen or skip a test: the check that an uncoded counted job is valid module data stays. One rule, all 56 places: the witness comes from a drawn place, redrawn (bounded, each place named) when none hires such a worker, or from a position opened through the jobs engine's own producers, not from one pinned town's timing.

**Done when.** src/core2/closure-counted-seeker-finite.test.ts passes on main's head and on two fresh seeds named in the PR body, each naming the counted job id it checked; with the conditional occupationClassification spread in hireCounted (src/core2/modules/jobs.ts) reverted, it fails.

**Files.** src/core2/closure-counted-seeker-finite.test.ts

**Notes.** 2026-10-25 (claude/closure-seeker-witness): natural uncoded counted hires are rare (none in 12 months in Cleona PA, Washington DC, Bayshore NC or Chickamauga GA, measured), so the test now opens one position on a drawn town's press outlet staff job, as the engine does when a reporter leaves, and the weekly round fills it from the counts within a week.

Sent back 2026-10-25 from PR #6013 (branch claude/closure-seeker-witness): own typecheck TS2305 closure-counted-seeker-finite.test.ts:23 imports ModuleRow from ./types instead of exporting ./module-data; fixed the same day (import moved to ./module-data, typecheck, two fresh witnesses and the break-it rerun).
