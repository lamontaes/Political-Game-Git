---
id: gov-public-posts-paid-for-template-hours
title: "A public post is paid for the template job's 48-hour week while its stated pay and the budget assume 40, so press staff and other posts cost 20 percent more than planned"
area: gov
kind: bug
priority: 2
size: M
status: done
claimed-by: claude/public-posts-pay-schedule
pr: #5013
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-18T01:00:42.004Z
---

**What.** A public post (press staff, a state board of elections post, appointees) copies the work schedule of the longest-hours job in town, and payroll paid its hourly rate for the scheduled minutes, 48 hours a week against the 40 its stated pay and budget assume, so these posts cost up to 20 percent more than planned. The other 24 jobs sampled in one town ran at 0.9 to 1.125 of their stated hours. This is the same defect as `world-press-outlet-revenue-wage-gap`, fixed in `startPublicJob` (`src/core2/public-payroll.ts`) by setting the hourly rate over the scheduled minutes: Texhoma, Texas (seed a9747c3b9e6fc5e2:0) had a press job 6.6 percent over its posted pay before, and `src/core2/press-pay-matches-schedule.test.ts` now holds every local press job to its posted annual pay.

**Rules.** Wire to the world: payroll, the post's budget line and the director read the same pay. One rule, all 56 places.

**Done when.** In the played world (`buildBenchWorld`, a drawn place and seed named in the test output) every public post's annual pay over its scheduled minutes is within 2 percent of its stated annual pay, by job id; `src/core2/press-pay-matches-schedule.test.ts` holds this for local press jobs, and the executive, staff and state-board posts started through `startPublicJob` need the same check.

**Files.** src/core2/public-payroll.ts, src/core2/press-pay-matches-schedule.test.ts

**Notes.** Filed at the same time as the fix. The press staff are covered by the test; the other posts that use `startPublicJob` (executive appointees, state staff, office jobs) take the same code path and are not yet checked one by one. The jobs outside `startPublicJob` are `world-opening-schedules-run-over-job-hours`. The CTO may close this item once those posts are checked.

Checked Oct 18 (claude/public-posts-pay-schedule): the fix in `startPublicJob` holds for every kind of public post. `src/core2/public-post-pay-matches-schedule.test.ts` runs a drawn place for 120 days and holds every open `job:public:` post (department heads, the state chief election official, press staff, office seats, officials' aides) to its stated annual pay within 2 percent; it passed in six drawn places (seeds q1 to q5 and one random). Nothing outside `startPublicJob` is covered; that stays with `world-opening-schedules-run-over-job-hours`.
