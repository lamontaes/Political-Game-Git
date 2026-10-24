---
id: core-speed-work-attendance-in-play
title: "A day's work attendance does in play only what play reads (Long Hill: 24 s of the year)"
area: core
kind: bug
priority: 1
size: M
status: claimed
claimed-by: claude/speed-work-in-play
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T00:54:36.684Z
---

**What.** Recording a worker's attendance takes 24.1 of 264 profiled seconds of a played year in Long Hill, Connecticut (seed m7b). For every attendance, recordWorkAttendance builds detached views of the commitment, job, decision and offer, shallow-copies the input, the actor and the reasons, checks property descriptors on each row (ordinaryRow), re-guards the pay and schedule sources and re-admits the payroll calendar, all with bookkeeping off. Play should read the live rows and write the result; the copies and checks stay under the bookkeeping switch so tests keep them.

**Rules.** Bookkeeping is a debug switch: read tracing, validation and copying run in tests, not in play. Speed: no change makes a year slower, measured before and after on the same machine. No dice: every worker attends and is paid exactly as before.

**Done when.** In the played world (buildBenchWorld, Long Hill, Connecticut, seed m7b) the year's fingerprint from npm run speed:year stays fcdd81f3359b and a drawn place's three-year fingerprints are unchanged; recordWorkAttendance's inclusive time in a CPU profile falls by at least half; the work, attendance and payroll tests pass, with the speed lead's before and after in the PR body.

**Files.** src/core2/work-attendance.ts

**Notes.** Filed Oct 24 by the speed lead from the by-module profile in core-speed-year-over-limit-dense-town. The work helper owns src/core2/work-attendance.ts, src/core2/work-payroll-cash.ts and src/core2/work-pay-period.ts while it runs.
