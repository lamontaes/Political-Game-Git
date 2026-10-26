---
id: core-payroll-arrears-retry-crash
title: "A year crashes on a payroll arrears retry membership (2027-03-20)"
area: core
kind: bug
priority: 3
status: done
claimed-by:
pr: #4690
blocked-on:
milestone:
source: 'docs/coordination/play.md "Needs from other sessions" (line 147); triage in play-needs-play-147'
claimed-at:
---

**What.** In a normal town the clock threw Payroll arrears lost their actual recorded retry membership on 2027-03-20, from the payroll dispatch when a job ended while a payroll retry was pending. The guard is still in work-payroll-dispatch.ts. Reproduce it with buildBenchWorld story-b and a minimum of 1500 people, playing the 17-year-old and skipping in week legs; it may be fixed already. If it still fails, the job ending must remove or settle the retry in the same step.

**Rules.** No dice. An effect is a read: the job ending and the retry read each other's records. Speed: the fix adds no daily scan. A fix lands on the branch where it reproduces.

**Done when.** In the played world (buildBenchWorld, every module installed) with seed story-b and a minimum of 1500 people (name the place in the PR body), a one-year skip reaches 2027-12-31 with no throw, and a test beside src/core2/work-payroll-dispatch.test.ts ends a job with a pending retry and checks the arrears record id. If it no longer reproduces, say so and close the line.

**Files.** src/core2/work-payroll-dispatch.ts, src/core2/modules/jobs.ts

**Notes.** Found while triaging play-needs-play-147.

Sent back 2026-10-16 from PR #4690 (branch claude/payroll-arrears-crash): GitHub refuses to merge a draft pull request (HTTP 405: "Pull Request is still a draft"). The merger skill's prescribed REST ready-for-review endpoint returns HTTP 404. Mark this PR ready for review, retain the named changed-file checks at the top, and push any needed corrections; finish on that branch, merge main into it first.
