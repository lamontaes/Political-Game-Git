---
id: play-stop-09-jobs-here-count-too-high
title: "News says 2,036 people work in a town of 2,570, with zero open jobs"
area: core
kind: bug
priority: 1
size: S
status: blocked
claimed-by:
pr: #6037
blocked-on: owner-installed-build-acceptance
source: added with npm run pool -- add
lead: play-first
milestone: play-first
claimed-at:
---

**What.** Six days into a life in Anson, Texas (2,570 people on the town list) on the v0.22.10 release, News shows "JOBS HERE 2036 employed · 23 looking · 0 open". That is 79 percent of every resident, children and retirees included, at work, and not one open job in the town. The same screen gives the region's unemployment as 4.4 percent. I expected a job count that fits the town and at least a few openings a new 18-year-old could take.

**Rules.** Serves LAW.md §6, News; LAW.md §11, The world on screen makes sense. Estimate, never UNKNOWN: the employed count starts from the place's real labor force and is marked as an estimate if modeled. One model, two tiers: counted residents and full people are counted once each in the jobs total.

**Done when.** The owner does the same steps on the next build and is not stopped: in a drawn town, News shows an employed count no larger than the town's working-age population and an open-jobs number consistent with the jobs screen. Shown by a screenshot from the installed build in a drawn place, with the place and seed named.

**Time box.** 3 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** News's jobs line in a drawn town counts fewer people at work than the town's working-age residents, and its open jobs match the Jobs screen.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/economy.ts, src/bench/jobs.ts, src/core2/modules/jobs.ts, src/core2/modules/residents.ts

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md). Release v0.22.10 (4c943f3), Anson, Texas, game seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213. Log 16:02; screenshot 39. Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md); was m0-m2.

Sent back 2026-10-25 from PR #6037 (branch claude/play-stop-09-jobs-here): Done-when requires installed-build drawn-place screenshot/owner replay; body provides bench screenshots and defers installed proof to nextrelease; supply it or boundimplementationwhilekeepingplaystopacceptanceopen; finish on that branch, merge main into it first.

Oct 25, 16:25 UTC (speed lead): the fix is in PR 6037 under `play-jobs-here-counts-the-town`, with bench screenshots and tests, as Merger 1 suggested on PR 6037. This item stays open, blocked on the owner's steps on the next installed build (its done-when); close it when the owner confirms.
