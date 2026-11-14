---
id: jobs-opening-seats-more-jobless-than-its-flows-hold
title: "Tanapag opens with more people out of work than its flows hold, and loses a third of them by spring"
area: world
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after: jobs-opening-jobless-stock-drains-toward-flows
blocked-on:
lead: jobs
source: "Account lead F1, Nov 14, 2026, after the coordinator's review of the opening-stock fix"
model: opus
effort: medium
root: rc10-screens-keep-own-facts
---

**What.** After the flows are scaled to the state's rate, Tanapag still loses about half its jobless in two months and then holds near 30, so its rate on the Metrics tab and in the paper falls without a cause. A player who opens a small town with a high rate sees it drop by a third before spring. Seen: Tanapag's Metrics rate in February to April of a new life.

**Cause.** Needs cause. Measured: Tanapag, Northern Mariana Islands (US-MP), seed 9e95b68a47a0d28082fc4d0185f47064, 1,500 people, no layoffs, the town's out-of-work people at each month end from January 31 with the state's separation scale in: 57 41 27 26 34 34 32 33 31 31 36 25 30; Maloata, American Samoa (seed probe-b) 56 51 46 49 65 57 60 46 48 45 46 56 60; Staples, Connecticut (seed probe-a) 20 20 24 30 35 38 35 33 30 25 23 18 13. Tried and ruled out: scaling layoffs by the town's own region (the territory's rate was 12.6% in March, scale 3.06 against the state's 2.99) gave the same Tanapag and Maloata series and Staples within one person, so the scale is not the gap. Ruled out too: the opening's vacancies (the town's fillable openings by week from the first review were 2, 0, 0, 1, 3, 0, 0, 0, 0, 0, 5, 12, 15, 16, so nobody is hired into a pile of jobs). Left: the opening seats 56 people at 13.7% of the town's workers, and the flows at that scale sustain about 30 to 36 (about 10%). Read how `bandQuotas` and `openingRate` (src/core2/modules/jobs.ts) seat the opening's jobless against the rate the scale reads (`workConditions` and `regionalConditions`, src/core2/jobs-elsewhere.ts), and whether the opening reads the region's rate for a later month than the scale does.

**Fix.** None until the cause is found.

**Time box.** 3 hours for one Opus session at medium effort. When it runs out, push the measurements and what is found, set the state honestly with a one-line note, and stop.

**Rules.** No dice; sliding scales; real rates check totals and never pick one actor's outcome (`no-dice`, `labor-market-proof`). Speed: no year more than 20% slower.

**Done when.** A second session, not the builder, runs a test of a no-layoff year at Tanapag, Northern Mariana Islands, Maloata, American Samoa, Staples, Connecticut and a drawn place nobody chose, and each town's out-of-work count in months five to eleven stays between 0.7 and 1.4 times its count at the first review.

**Waits on.** The opening-stock fix (jobs-opening-jobless-stock-drains-toward-flows).

**Files.** src/core2/jobs-elsewhere.ts, src/core2/modules/jobs.ts
