---
id: gov-staff-review-hires-unpaid-aide
title: "An official still hires an aide onto a budget line that can pay none, and the aide works unpaid"
area: gov
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: found while fixing tests-small-town-treasury-payroll-red, Oct 25
claimed-at:
---

**What.** An aide's pay is now capped at what its budget line can carry (hireStaff in src/core2/modules/staff.ts, as executive.ts caps a town's department heads), so a hire onto a line with no room left is held unpaid: startPublicJob returns no job and the aide keeps whatever job they had. The monthly staff review still decides to hire with only budgetLean's soft lean against an exhausted line, and its applicant check compares people's pay with the full staff wage, not the capped pay. So in a small town such as Brookford, North Carolina an official can still take on an aide the town pays nothing.

**Rules.** No dice: the official's choice reads the money the line has, so a line that can pay no aide gets no hire, and applicants are those the capped pay would draw. Sliding scales and causes: the lean toward hiring keeps falling as the line's room shrinks; the stop is the line being unable to pay, the same rule a department head's post follows.

**Done when.** In a one-year buildBenchWorld run of Brookford, North Carolina (place key 3708140, seed brookford-1) and a place drawn from all 56, no aide is hired onto a line whose cap is zero, every serving aide holds a paid job:public:staff job, by staffer and job id in the PR body, and src/core2/staff.test.ts and src/core2/small-town-treasury-payroll.test.ts pass.

**Files.** src/core2/modules/staff.ts, src/core2/staff.test.ts

**Notes.** staffReview's hire condition is being rewritten by lamontaes/Political-Game-Git#5715 (leanedYes); build this on it once it merges.
