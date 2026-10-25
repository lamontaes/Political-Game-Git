---
id: play-stop-08-no-high-school-at-seventeen
title: "A 17-year-old has no high school; only a middle and an elementary school are listed"
area: core
kind: bug
priority: 1
size: S
status: blocked
claimed-by: claude/play-stop-08-high-school
pr: #6038
blocked-on: owner-installed-build-acceptance
source: added with npm run pool -- add
lead: play-first
milestone: play-first
claimed-at: 2026-10-25T14:00:23.897Z
---

**What.** I started a life as Bo Snider, age 17, in Anson, Texas on the v0.22.10 release. Who you are lists SCHOOL as "Anson Middle" and "Anson El", and Jobs and study says "No current job" with Study "2018 Anson Middle, 2012 Anson El". No high school appears, and I am not enrolled anywhere in my senior year. "Anson El" is a cut-off name. I expected Anson High School, current, and a school day to happen.

**Rules.** Serves LAW.md §5, Journal and the past; LAW.md §11, The world on screen makes sense. Estimate, never UNKNOWN: a 17-year-old's school starts from the town's real schools and enrollment, marked as an estimate if needed. One rule, all 56 places: school age and grade come from age, not from the place.

**Done when.** The owner does the same steps on the next build and is not stopped: a new life at age 17 in a drawn town shows a current high school by its full name on Who you are and Jobs and study. Shown by a screenshot from the installed build in a drawn place, with the place and seed named.

**Time box.** 3 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** At 17, Who you are and Jobs and study show the town's high school by its full name, as the school you go to now.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/core2/deep-past.ts, src/core2/data/deep-past.json, src/bench/jobs.ts, src/bench/card.ts

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md). Release v0.22.10 (4c943f3), Anson, Texas, game seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213. Log 15:56; screenshots 20, 22. Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md); was m0-m2.

Oct 25, 16:25 UTC (speed lead): the fix is in PR 6038 under `play-teen-has-current-high-school`, with bench screenshots and tests, as Merger 1 suggested on PR 6037. This item stays open, blocked on the owner's steps on the next installed build (its done-when); close it when the owner confirms.
