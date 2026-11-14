---
id: jobs-opening-town-rate-above-its-states-holds-below-it
title: "A town that opens above its state's unemployment rate still sinks toward it in the first two months"
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

**What.** After the flows are scaled to the state's rate, a town whose own opening rate is well above its state's still loses about half its jobless in two months and then holds near the state's level, so its rate on the Metrics tab and in the paper falls without a cause. A player who opens a small town with a high rate sees it drop by a third before spring. Seen: Tanapag's Metrics rate in February to April of a new life.

**Cause.** Measured: Tanapag, Northern Mariana Islands (US-MP), seed 9e95b68a47a0d28082fc4d0185f47064, 1,500 people, no layoffs, a probe of the town's out-of-work people each week (jobless in the town at the end of each month, January 31 to January 31 with the state's scale in): 57 41 27 26 34 34 32 33 31 31 36 25 30. The state's rate is 9.7% (scale 2.99) and the town opens at 13.7%, so entries (3 to 9 a month) sustain about 30 people, not 57. Not the opening's vacancies as first thought: the town's fillable openings by week from the first review (without the scale) were 2, 0, 0, 1, 3, 0, 0, 0, 0, 0, 5, 12, 15, 16, so nobody is hired into a pile of openings; the early leavers (13, 20 and 13 in months two to four) are the opening's seekers whose finding progress reaches one and who take regional work (`reviewRegionalFinds`, src/core2/modules/jobs.ts), while entries are too few to replace them.

**Fix.** Scale layoffs by the town's own opening rate (the regional series `openingRate` reads in src/core2/modules/jobs.ts, kept once at the first review per place) against the nation's, not the state's, so a town opening at 13.7% in a state at 9.7% holds near 13.7%. Prove at Tanapag, Maloata and Staples, months 1 to 12 with and without, each side twice, plus time per record.

**Time box.** 3 hours for one Opus session at medium effort. When it runs out, push the measurements and what is found, set the state honestly with a one-line note, and stop.

**Rules.** No dice; sliding scales; real rates check totals and never pick one actor's outcome (`no-dice`, `labor-market-proof`). Speed: no year more than 20% slower.

**Done when.** A second session, not the builder, runs a test of a no-layoff year at Tanapag, Northern Mariana Islands, Maloata, American Samoa, Staples, Connecticut and a drawn place nobody chose, and each town's out-of-work count in months five to eleven stays between 0.7 and 1.4 times its count at the first review.

**Waits on.** The opening-stock fix (jobs-opening-jobless-stock-drains-toward-flows).

**Files.** src/core2/jobs-elsewhere.ts, src/core2/modules/jobs.ts
