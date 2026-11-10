---
id: gov-staff-review-hires-unpaid-aide
title: "An official still hires an aide onto a budget line that can pay none, and the aide works unpaid"
area: gov
kind: bug
priority: 3
size: S
status: dropped
claimed-by:
pr:
blocked-on:
standard: 2
model: sonnet
effort: low
lead: governing
root: none
source: found while fixing tests-small-town-treasury-payroll-red, Oct 25
claimed-at:
after:
checked: fable 2026-11-10
---

**What.** An aide's pay is now capped at what its budget line can carry (hireStaff in src/core2/modules/staff.ts, as executive.ts caps a town's department heads), so a hire onto a line with no room left is held unpaid: startPublicJob returns no job and the aide keeps whatever job they had. The monthly staff review still decides to hire with only budgetLean's soft lean against an exhausted line, and its applicant check compares people's pay with the full staff wage, not the capped pay. So in a small town such as Brookford, North Carolina an official can still take on an aide the town pays nothing.

**Cause.** Found in code: src/core2/modules/staff.ts function hireStaff (line 700) holds a hire unpaid when the line has no room, while the monthly review's leanedYes call (line 1048) uses budgetLean (line 801) and compares applicants against the full staff wage; seen in Brookford, North Carolina (key 3708140, seed brookford-1).

**Fix.** Make the hire decision read the money the line actually has and compare applicants against the capped pay, so a zero-cap line gets no hire.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** No dice: the official's choice reads the money the line has, so a line that can pay no aide gets no hire, and applicants are those the capped pay would draw. Sliding scales and causes: the lean toward hiring keeps falling as the line's room shrinks; the stop is the line being unable to pay, the same rule a department head's post follows.

**Done when.** A second session, in a one-year buildBenchWorld run of Brookford, North Carolina (place key 3708140, seed brookford-1) and a place drawn from all 56, finds no aide hired onto a line whose cap is zero and every serving aide holding a paid job:public:staff job (staffer and job ids in the PR body); src/core2/staff.test.ts and src/core2/small-town-treasury-payroll.test.ts pass.

**Waits on.** Nothing.

**Files.** src/core2/modules/staff.ts, src/core2/staff.test.ts, src/core2/small-town-treasury-payroll.test.ts

**Notes.** staffReview's hire condition is being rewritten by lamontaes/Political-Game-Git#5715 (leanedYes); build this on it once it merges.

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have stopped a small-town official hiring an aide with no pay room; the aide is a payroll line no player screen shows.
