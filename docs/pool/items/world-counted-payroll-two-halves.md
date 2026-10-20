---
id: world-counted-payroll-two-halves
title: "A counted worker's hire, raise or layoff reaches only one of the two flows of a twice-a-month payroll"
area: world
kind: bug
priority: 1
size: S
status: claimed
claimed-by: claude/payroll-two-halves
pr: #4928
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T01:13:24.917Z
---

**What.** A counted worker on a twice-a-month payroll is two wage records, one for each payday, each listing every worker and paying half. A raise or a new minimum wage changed only one of them, a new hire was added to only one, and a laid-off worker was removed from only one, so the worker got half the raise, was paid half, or kept drawing half their old pay. After a played year on main, 31 ended jobs in a Maine town, 25 in a Connecticut town and 43 in a Kansas town were still being paid. Pull request 4928 makes a job's end, raise and hire reach both flows.

**Rules.** One model, two tiers: a counted worker's pay changes by the same rule as a full worker's, on every payday of the payroll. Every dollar balances.

**Done when.** In the played world (`buildBenchWorld`) in a drawn place that pays twice a month, a counted raise, hire and layoff reach both paydays, shown by job and flow ids; `src/core2/counted-payroll-halves.test.ts` fails without the change, and a played year leaves none of the ended jobs paid.

**Files.** src/core2/residents-economy.ts, src/core2/counted-payroll-halves.test.ts, src/core2/residents.test.ts

**Notes.** Body repaired Oct 17 (claude) from the pull request's description; the fix is in that pull request.

Sent back 2026-10-20 from PR #4928 (branch claude/tests-early-returns-residents-s5): Merge main fc2817d7d5b5 into claude/tests-early-returns-residents-s5 conflicts in: src/core2/residents.test.ts. Resolve these files with a normal merge before changed-file validation; no integrated green head exists.; finish on that branch, merge main into it first.
