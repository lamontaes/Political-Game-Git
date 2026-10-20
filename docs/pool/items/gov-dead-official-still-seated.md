---
id: gov-dead-official-still-seated
title: "An official who dies in office stays seated with no end date and is no longer paid (U.S. House member from Florida, Willow Creek, Alaska, seed 162056d164d81980)"
area: gov
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/dead-official-vacates
pr: #4991
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-17T22:58:57.692Z
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

Sent back 2026-10-20 from PR #4989 (branch claude/official-payroll-first-check): Morning check: src/core2/official-salary-payroll.test.ts adds core.people.get(row.id)?.alive to the salary/paycheck assertion guard, dropping that invariant for officials who died. The merger rule forbids loosening tests. Fix the vacancy/pay root cause (#4991) and retain an equally strong prorated assertion through the official death/end date instead of excluding dead officials.; finish on that branch, merge main into it first. Current replacement claim and PR are preserved.
