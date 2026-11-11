---
id: laws-staffing-line-unstaffed-employer
title: "A raised public-safety line funds paid positions at an employer with no paid staff"
area: laws
kind: bug
priority: 2
size: S
status: claimed
standard: 2
claimed-by: claude/pool-laws-staffing-line-unstaffed-employer
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-11T06:21:19.010Z
after:
lead: laws-effects
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
checked: fable 2026-11-10
branch: claude/pool-laws-staffing-line-unstaffed-employer
---

**What.** The staffing reach (src/core2/law-reach/group-a-staffing.ts) funds an employer for its opening staff times the line against its base. A fire department with no paid staff, such as a volunteer company in a small town, is therefore funded for zero positions however much its line rises. The raise moves money and reaches nobody: seen in drawn places such as White Meadow Lake, New Jersey and Henderson, Louisiana (budget-line-staffing.test.ts, Oct 24). Seen: a raised public-safety line on the budget that pays nothing at a volunteer department.

**Cause.** Found in code: `staffing` in src/core2/law-reach/group-a-staffing.ts (lines 191 to 197) sets funded positions to `baseStaff * ratio`, and `baseStaff` is 0 for an employer with no paid staff, so positions stay 0 however far the line rises; the calendar worker (`onReachCalendar(STAFFING_KIND ...)`, line 296) posts openings only by copying an existing job as `templateJobId`, and a volunteer company has none.

**Fix.** When `baseStaff` is 0 use the money-based formula already used for the no-employer branch (the line change over `publicPositionAnnualMinor`), split among the town's unstaffed employers of that kind, and post openings from a sourced role (title, occupation, BLS OEWS wage, public-safety week hours) kept as data beside `employers` in src/core2/data/laws/reach-group-a.json, building the template job through `startPublicJob` in src/core2/public-payroll.ts so payroll, commitment and pay authority exist.

**Time box.** 6 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record: the employer the line funds posts openings that the jobs engine fills, and each hire is recorded through lawApplied. Sliding scales and causes: positions follow the money (the line's change over the cost of a position, publicPositionAnnualMinor) where the opening staff gives no base. One model, two tiers: named and counted seekers are hired by the same rule.

**Done when.** A second session, not the builder, checks this in the running game. In a played world (buildBenchWorld) in a drawn place whose fire or police employer has no paid staff, raising the line by at least one position's cost posts an opening the jobs engine fills, recorded by lawApplied with the hire's record id, and putting the line back lays that hire off; the test names the place and seed. **On screen.** Nothing yet: it would show on Politics → Budgets, and nothing there reads it.

**Waits on.** Nothing.

**Files.** src/core2/law-reach/group-a-staffing.ts, src/core2/data/laws/reach-group-a.json, src/core2/public-payroll.ts, src/core2/modules/jobs.ts, src/core2/budget-line-staffing.test.ts

**Notes.** Found Oct 24 by the laws lead while moving the staffing lines' hires onto the jobs engine (PR #5582, branch claude/law-wiring-government).
Analysis (claude pool worker, Oct 27; released unbuilt, more than the S/3-hour box). Two gaps, not one. (1) Funding: in `staffing` (src/core2/law-reach/group-a-staffing.ts, about line 197) an employer's funded positions are `baseStaff * ratio`, and for an unstaffed employer `baseStaff` is 0, so positions stay 0 however much the line rises. The no-employer branch already has the money-based formula, `(spendingMinor[line] - base) / publicPositionAnnualMinor`; an unstaffed employer would use the same, split among the town's unstaffed employers of that kind. (2) Hiring: the calendar worker (`onReachCalendar(STAFFING_KIND ...)`, about line 309) posts openings only from `staff[0]?.jobId ?? counted[0]?.id`, a job to copy for title, occupation, pay, schedule and commitment (`postFundedOpenings` in src/core2/modules/jobs.ts line 3640 copies them from `templateJobId`). A volunteer company has no job, and no other employer's job is the right occupation, so the opening cannot be posted. That needs a sourced role for the line (firefighter, police officer: title, occupation classification and BLS OEWS wage, hours of a public-safety week), either as `staffing.<line>.role` data in src/core2/data/law-reach beside `employers` and `levels`, or taken from `src/simulation/living-world/town-employment.ts`'s occupation tables, with a template job built through `startPublicJob` so payroll, commitment and the pay authority exist. Build order for whoever takes it: the role data with its citation first (researcher), then (1), then a template-less post path in `postFundedOpenings`, then the test in budget-line-staffing.test.ts that names the drawn place (White Meadow Lake, New Jersey and Henderson, Louisiana showed it Oct 24) and fails without the change.

Released (2026-11-11): 6-hour item needing a new sourced role data row and payroll template; not started. Continue on branch claude/pool-laws-staffing-line-unstaffed-employer.

Released (2026-11-11): Not built: the funding half alone (money-based positions for an employer with no paid staff, split among the town's unstaffed employers, group-a-staffing.ts line ~197) would write a positions record no engine reads, because hiring copies a template job and a volunteer company has none; the item is one unit with the sourced role row (title, occupation, BLS OEWS wage, public-safety hours) and startPublicJob template, which is the 6-hour part and needs a researched wage row first. Continue on branch claude/pool-laws-staffing-line-unstaffed-employer.

Claimed by next for sonnet-2698 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 06:21 UTC) on branch claude/pool-laws-staffing-line-unstaffed-employer.
