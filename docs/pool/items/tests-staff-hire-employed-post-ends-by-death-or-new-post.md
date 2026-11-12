---
id: tests-staff-hire-employed-post-ends-by-death-or-new-post
title: "The aide-from-a-job test fails when the aide dies or takes another public post"
area: office
kind: bug
priority: 3
size: S
status: open
standard: 2
after:
blocked-on:
lead: governing
model: sonnet
effort: low
root: none
source: found by a fixer on PR #8567, Nov 12
---

**What.** src/core2/staff-hire-employed.test.ts requires every aide hired from a private job, with no dismissal on the staff row, to have a post still running after 400 played days. In some drawn places that fails though nothing is wrong: the aide's post ended because the aide died, or because the aide was appointed to another public post, and the staff row records neither. Guards: the aide-hire test fails only when an aide's post ended for no recorded reason, so the office staffing a player sees stays trustworthy.

**Cause.** Found in code: the test's undismissed branch (the `expect(post.endsAt ...).toBeUndefined()` after the `row.dismissed` check in src/core2/staff-hire-employed.test.ts) treats every other end as a defect. Measured: at Townshend, Vermont (5073225), world seed e08b751381b9d0c300eb0c369cc39dd52f14125abbec67c38f2120e63ba15279, 400 days, `job:public:staff:person_a823a8d3859cdf41:person_edfd255f79508e54` ended 2025-04-30 with source `life.death:person_edfd255f79508e54:2025-04-29` (src/core2/modules/jobs.ts:5078, onCalendarWork), and `job:public:staff:official:term:seat:US-VT:lower:W-5:0:2025-01-20:person_6dbd6b3a393db455` ended 2025-12-16 with source `public-post:town:police-chief:2025-12-16` (src/core2/public-payroll.ts:148, startPublicJob, called from fillTownPost in src/core2/modules/executive.ts:614). A probe of Breckenridge, Missouri (2908128), world seed fdee0baa027ff2da0acec60ec2c2b27a42be0f3d1f80ca437f42565ad9e7a344, also had one from-job aide whose post ended with no dismissal. Places and seeds are evidence only.

**Fix.** In the test, read why a post ended before calling it a defect: a dismissed row (existing check), a person who is no longer alive (post ended on or the day after the death), or a person who now holds a different job that started on the end date. Any other end still fails. Keep the running-post check for every aide with none of these. Do not change the staff engine.

**Time box.** 1.5 hours.

**Rules.** Ask why: the test names the end's reason by record id. No place named in the test's logic.

**Done when.** A second session runs src/core2/staff-hire-employed.test.ts on the Townshend seed above and on two drawn places it chose (each place and seed named); the test passes, the Townshend aide's post is shown ended by death and the police-chief aide's by the new post, each by job id, and an aide whose post ended for neither reason would still fail.

**Waits on.** Nothing.

**Files.** src/core2/staff-hire-employed.test.ts, src/core2/modules/staff.ts

**Notes.** Found while fixing #8567 (tests-staff-hire-employed-dismissed-aide).
