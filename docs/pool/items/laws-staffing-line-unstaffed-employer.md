---
id: laws-staffing-line-unstaffed-employer
title: "A raised public-safety line funds paid positions at an employer with no paid staff"
area: laws
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The staffing reach (src/core2/law-reach/group-a-staffing.ts) funds an employer for its opening staff times the line against its base. A fire department with no paid staff, such as a volunteer company in a small town, is therefore funded for zero positions however much its line rises. The raise moves money and reaches nobody: seen in drawn places such as White Meadow Lake, New Jersey and Henderson, Louisiana (budget-line-staffing.test.ts, Oct 24).

**Rules.** An effect is a read, not a record: the employer the line funds posts openings that the jobs engine fills, and each hire is recorded through lawApplied. Sliding scales and causes: positions follow the money (the line's change over the cost of a position, publicPositionAnnualMinor) where the opening staff gives no base. One model, two tiers: named and counted seekers are hired by the same rule.

**Done when.** In a played world (buildBenchWorld) in a drawn place whose fire or police employer has no paid staff, raising the line by at least one position's cost posts an opening the jobs engine fills, recorded by lawApplied with the hire's record id, and putting the line back lays that hire off; the test names the place and seed. **On screen.** Nothing yet: it would show on Politics → Budgets, and nothing there reads it.

**Files.** src/core2/law-reach/group-a-staffing.ts, src/core2/budget-line-staffing.test.ts

**Notes.** Found Oct 24 by the laws lead while moving the staffing lines' hires onto the jobs engine (PR #5582, branch claude/law-wiring-government).
Analysis (claude pool worker, Oct 27; released unbuilt, more than the S/3-hour box). Two gaps, not one. (1) Funding: in `staffing` (src/core2/law-reach/group-a-staffing.ts, about line 197) an employer's funded positions are `baseStaff * ratio`, and for an unstaffed employer `baseStaff` is 0, so positions stay 0 however much the line rises. The no-employer branch already has the money-based formula, `(spendingMinor[line] - base) / publicPositionAnnualMinor`; an unstaffed employer would use the same, split among the town's unstaffed employers of that kind. (2) Hiring: the calendar worker (`onReachCalendar(STAFFING_KIND ...)`, about line 309) posts openings only from `staff[0]?.jobId ?? counted[0]?.id`, a job to copy for title, occupation, pay, schedule and commitment (`postFundedOpenings` in src/core2/modules/jobs.ts line 3640 copies them from `templateJobId`). A volunteer company has no job, and no other employer's job is the right occupation, so the opening cannot be posted. That needs a sourced role for the line (firefighter, police officer: title, occupation classification and BLS OEWS wage, hours of a public-safety week), either as `staffing.<line>.role` data in src/core2/data/law-reach beside `employers` and `levels`, or taken from `src/simulation/living-world/town-employment.ts`'s occupation tables, with a template job built through `startPublicJob` so payroll, commitment and the pay authority exist. Build order for whoever takes it: the role data with its citation first (researcher), then (1), then a template-less post path in `postFundedOpenings`, then the test in budget-line-staffing.test.ts that names the drawn place (White Meadow Lake, New Jersey and Henderson, Louisiana showed it Oct 24) and fails without the change.
