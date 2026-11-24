---
id: jobs-opening-hourly-pay-under-the-floor-seen-in-office-hours
title: "A resident's job opens at an hourly rate far under the floor, so a wage complaint at office hours names a wage nobody is paid"
area: core
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
source: found while carrying #8956 (office hours) on #9199
lead: jobs
standard: 2
model: opus
effort: medium
root: none
---

**What.** In Stephens, Arkansas (0566860, seed `case-help-pinned-1:help:22`, drawn by the case-help test), a resident's job is recorded at $4.59 an hour against a floor of $11 (`state.work.commitments` hourlyMinor, read by `src/core2/modules/constituent-cases.ts` near line 213), and a second drawn case read $3.03. A person paid that little at full time is not believable, so the wage complaint at office hours rests on a number the world should not hold. Seen: in the office-hours talk the resident's answer to "How much do they pay you an hour?".

**Cause.** Needs cause. Looked at: `src/core2/modules/work.ts` derives an hourly rate "recovered from rounded calendar-average pay"; whether these jobs are real part-time rates or a rate divided over too many calendar hours is not measured.

**Fix.** None until the cause is found.

**Time box.** 2 hours for an Opus session at medium effort.

**Rules.** Estimate, never UNKNOWN: pay starts from the place's real figure for that job with a spread. No dice. One rule, all 56 places.

**Done when.** A second session draws three places the builder did not choose (a drawn place, named in the check), plays to office hours, and in the running game sees no wage complaint whose pay is under the floor unless a record lowered it (named by record id).

**Waits on.** Nothing.

**Files.** src/core2/modules/work.ts, src/core2/modules/constituent-cases.ts
