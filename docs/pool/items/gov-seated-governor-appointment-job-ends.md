---
id: gov-seated-governor-appointment-job-ends
title: "appointGovernor throws A job ends before its day's work after the player is seated as governor"
area: office
kind: bug
priority: 2
size: S
status: in-pr
claimed-by:
pr: #8668
blocked-on:
standard: 2
model: sonnet
effort: medium
root: none
source: governing lead, Oct 30 (found in phase A runs)
lead: governing
after:
checked: fable 2026-11-10
claimed-at:
branch: claude/pool-gov-seated-governor-appointment-job-ends
---

**What.** After the player is seated as governor through seatWinner, appointGovernor can throw that a job ends before its day's work, apparently because the seated player's job record ends on the day they are appointed. The words session's swearing-in test steps around it and names it (New Pekin IN). A governor the player wins must be seated without stopping the day.

**Cause.** Reproduced (2026-11-13) in 6 of 6 drawn places, for example Dandan, Northern Mariana Islands, seed 8ec0d4b3a3690ca453dd83134519812db8b04e454d7af2b5c859eda7c8835759 (the place this item named, New Pekin IN, is not in the place lookup). The seated player's own job is not involved: appointStatePost (src/core2/modules/executive.ts) ended the replaced holder's job with api.endJob on the day it replaced them; a holder who already worked that day (the player's day runs before the calendar's) makes endRecordedJob (src/core2/job-lifecycle.ts line 129) throw 'A job ends before its day's work'.

**Fix.** Make the appointee's old job end and the office job start on the same day through one path that respects the day-order rule in job-lifecycle.ts, then remove the swearing-in test's EngineGap detour.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** Wire to the world: the governor's seat, the job record and the appointment are one chain the offices and work engines both read, so the fix keeps one job record ending and one starting on the same day without a second path.

**Done when.** A second session, in a played-world test that seats a player as governor in a drawn place with its seed printed, runs appointGovernor and the next day's work without a throw, the old job ending and the office job starting by record id; in the running game the player wins a governor race, is sworn in and the day advances.

**Waits on.** Nothing.

**Files.** src/core2/modules/offices.ts, src/core2/modules/executive.ts, src/core2/job-lifecycle.ts, src/core2/office-day-state.ts, src/director/swearing-in-scene.test.ts

**Notes.** TODO

Released (2026-11-11): Not reproduced: src/director/swearing-in-scene.test.ts passes on a drawn seed with its governor seat seated, and the item names no seed (New Pekin, IN not found in the place lookup). Read in code: nominateAndConfirm already excludes anyone who worked today (executive.ts workedToday), so the likely throw is appointStatePost ending the PRIOR cabinet holder's job (api.endJob at executive.ts about line 1215) after that person's shift today; needs a failing place and seed before the fix. Continue on branch claude/pool-gov-seated-governor-appointment-job-ends.

Released (2026-11-11): Still no failing place and seed: the item names none. Candidate site confirmed in code (executive.ts line 1217 ends the replaced cabinet holder's job with no workedToday check, unlike the nominee filter at line 455), but guarding it needs a decision on what happens to the replaced holder who worked today; needs a repro first. Continue on branch claude/pool-gov-seated-governor-appointment-job-ends.

Released by next (2026-11-13): no push to claude/pool-gov-seated-governor-appointment-job-ends since 2026-11-12 21:10 UTC, more than twice its 3-hour time box. Continue on branch claude/pool-gov-seated-governor-appointment-job-ends and pull request #8668.

Account lead T31 (2026-11-13): Reproduced on the train branch in 6 of 6 drawn places (for example Dandan, Northern Mariana Islands, seed 8ec0d4b3a3690ca453dd83134519812db8b04e454d7af2b5c859eda7c8835759): a seated governor who appoints a state post twice, the day after the first appointee worked, throws at executive.ts appointStatePost, where the replaced holder's job ends (endJob, line 1237 before the fix). The item's account was wrong: the seated player's own job is not the cause, and the swearing-in test no longer has a detour. Fix: the replaced holder's job ends at once, or in the next calendar work when they worked today (as reviewOfficeJobs does for office jobs); same helper at the cabinet seating's replace (seatCabinetPerson). Test: src/core2/governor-appointment-job-ends.test.ts.
