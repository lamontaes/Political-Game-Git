---
id: work-legacy-pay-mode-blocks-rehire
title: "A worker paid by the legacy calendar-average mode can never be enrolled in payroll at their next hire"
area: core
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** In Superior, Colorado (GEOID 0875640, place seed a352f38e75486e3885a7fdd8f2dc6c1112a2e6da7628ff7c20dc4aca4c849a54, drawn by drawPlace('incumb-B:2','incumbency-totals')), after a firm with no cash or credit closes on 2027-03-13, a hire on 2027-04-05 throws 'Payroll enrollment is duplicate or follows an already settled work mode.' Stack: admitWorkPayrollCalendar (work-attendance.ts), addWorkPayrollCalendar, startRecordedJob (job-lifecycle.ts), startJob, hire (modules/jobs.ts). Cause: admitWorkPayrollCalendar refuses a person who has a latestLegacyCashResultByPerson entry, and nothing ever clears that entry when the legacy-paid job ends, so a worker laid off from a legacy-paid job (any opening job) can never take a payroll-enrolled job again. Repro: a script that builds buildBenchWorld with the drawn place and advances 30 days at a time, bookkeeping off, crashes on the third year after about 9 minutes.

**Rules.** No dice; one rule for all 56 places; one model two tiers; a work mode belongs to a job and ends with it; replace never layer

**Done when.** The Superior, Colorado world runs three years with no throw; a worker whose legacy-paid job ended can be hired into a payroll job, proved in the played world by the hire's record id; the legacy mode ends with the job it paid

**Files.** src/core2/work-attendance.ts,src/core2/job-lifecycle.ts,src/core2/work-cash.ts

**Notes.** Found behind finance-close-employer-no-current-receipt (closeEmployer accepted no legacy pay cause; PR fixer/red-main-finance-close fixes that first). Candidate fix: end the person's legacy cash mode where their job ends (job-lifecycle), not in the enrollment check.
