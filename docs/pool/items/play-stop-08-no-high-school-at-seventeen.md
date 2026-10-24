---
id: play-stop-08-no-high-school-at-seventeen
title: "A 17-year-old has no high school; only a middle and an elementary school are listed"
area: core
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
lead: m0-m2
milestone: play-first
---

**What.** I started a life as Bo Snider, age 17, in Anson, Texas on the v0.22.10 release. Who you are lists SCHOOL as "Anson Middle" and "Anson El", and Jobs and study says "No current job" with Study "2018 Anson Middle, 2012 Anson El". No high school appears, and I am not enrolled anywhere in my senior year. "Anson El" is a cut-off name. I expected Anson High School, current, and a school day to happen.

**Rules.** Estimate, never UNKNOWN: a 17-year-old's school starts from the town's real schools and enrollment, marked as an estimate if needed. One rule, all 56 places: school age and grade come from age, not from the place.

**Done when.** The owner does the same steps on the next build and is not stopped: a new life at age 17 in a drawn town shows a current high school by its full name on Who you are and Jobs and study. Shown by a screenshot from the installed build in a drawn place, with the place and seed named.

**Files.** src/core2/deep-past.ts, src/core2/data/deep-past.json, src/bench/jobs.ts, src/bench/card.ts

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md). Release v0.22.10 (4c943f3), Anson, Texas, game seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213. Log 15:56; screenshots 20, 22. Lead: m0-m2 (CTO, Oct 24; play-first order docs/work-orders/play-first-2026-10-24.md).
