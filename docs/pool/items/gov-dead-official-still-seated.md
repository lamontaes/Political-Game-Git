---
id: gov-dead-official-still-seated
title: "An official who dies in office stays seated with no end date and is no longer paid (U.S. House member from Florida, Willow Creek, Alaska, seed 162056d164d81980)"
area: gov
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/dead-official-vacates
pr: #4991
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-17T22:58:57.692Z
---

**What.** In Willow Creek, Alaska (seed 162056d164d81980, a year from January 20, 2025) the official `official:seat:US-FL:us-house:11` is a person who is no longer alive, yet their official row has no end (`ended` is null) and their pay row stays open: `payMonth` in src/core2/modules/official-pay.ts skips paying a person who is not alive and still moves `paidFrom` forward, so the seat shows a sitting member who is never paid again (paychecks stop after August 1, 2025). A member who dies leaves the seat vacant from the day they die, with the pay row ended and a successor or vacancy per the seat's law.

**Rules.** No dice: the vacancy follows the death record and the seat's law (special election or appointment). One rule, all 56 places. An effect is a read: the offices engine reads the death record.

**Done when.** In a played year in a drawn place (name place and seed), an official who dies has an end date on their official row on the day of death, their pay row ends, and the seat is open or filled by the law's rule; a test in src/core2 names the place and seed, and `official-salary-payroll.test.ts` needs no `alive` check.

**Files.** src/core2/modules/officials.ts, src/core2/modules/official-pay.ts, src/core2/modules/offices.ts

**Notes.** Built Oct 17 (claude/dead-official-vacates). The officials engine (`src/core2/modules/officials.ts`) now listens for `life.death` as well as `took-office` and ends the official's row that day; the official-pay review already ends the job and pay for an ended row. The offices engine did this for town seats (terms) and nothing did it for officials outside the town, which have rows but no term. A test in `src/core2/official-death-vacates.test.ts` kills a paid House member in a drawn place and checks the row ends that day and the pay row ends; the legislature, offices, succession, party-loyalty, stance, payroll and federal-day tests (41 tests) pass. Not done: who fills the seat. Outside seats are filled at the next general election by the coarse race path (world-races.ts), so a seat stays open until then; a special election for it is gov-special-election-races-outside-town.

Sent back 2026-10-20 from PR #4989 (branch claude/official-payroll-first-check): Morning check: src/core2/official-salary-payroll.test.ts adds core.people.get(row.id)?.alive to the salary/paycheck assertion guard, dropping that invariant for officials who died. The merger rule forbids loosening tests. Fix the vacancy/pay root cause (#4991) and retain an equally strong prorated assertion through the official death/end date instead of excluding dead officials.; finish on that branch, merge main into it first. Current replacement claim and PR are preserved.

Found running the core engine tests on main (release-suite-red-list-core2). The test now pays-checks only living officials; this item is the root cause. `core-official-payroll-first-paycheck-too-big` was the first, wrong reading of the same failure.
