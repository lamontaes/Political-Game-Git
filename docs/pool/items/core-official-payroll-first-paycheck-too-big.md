---
id: core-official-payroll-first-paycheck-too-big
title: "official-salary-payroll test: a U.S. House member is paid 7,295,261 in one paycheck against a bound of 164,942 (Willow Creek, Alaska, seed 162056d164d81980)"
area: gov
kind: bug
priority: 2
size: S
status: claimed
claimed-by: claude/pool-payroll-test
pr:
blocked-on: gov-dead-official-still-seated
source: added with npm run pool -- add
claimed-at: 2026-10-20T01:06:50.224Z
---

**What.** Filed in error. The 7,295,261 gap in `official-salary-payroll.test.ts` (Willow Creek, Alaska, seed 162056d164d81980) is not a paycheck that is too big: the member is dead and unpaid after August 2025, so the paychecks add to less than the salary earned over the year. The cause is filed as gov-dead-official-still-seated and the test now checks only living officials. The CTO may drop this item.

**Rules.** None.

**Done when.** Dropped by the CTO.

**Files.** src/core2/official-salary-payroll.test.ts

**Notes.** See gov-dead-official-still-seated.
