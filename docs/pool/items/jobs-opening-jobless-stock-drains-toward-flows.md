---
id: jobs-opening-jobless-stock-drains-toward-flows
title: "A town that opens with a high jobless count sees it halve in a month with nothing causing it, and one that opens low climbs"
area: world
kind: bug
priority: 2
size: L
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: jobs
source: "Account lead F1, Nov 14, 2026, tracing #9078's CI failure"
model: opus
effort: high
root: rc10-screens-keep-own-facts
---

**What.** A played town's jobless count in its first months moves by the gap between where the world opened and where its own flows settle, so the paper and Metrics show a rate that falls or climbs with nothing causing it. A player who opens a town with a 13.7% rate sees 6% a month later; one who opens at 5.9% sees 10% by summer. Seen: the Metrics tab's unemployment row and the local paper in the first four months.

**Cause.** Measured: three drawn places, 1,500 people, no layoffs, residents unemployed from the world-metrics table (Feb 2, Mar 2, Apr 2, May 2, Jun 2, Jul 2, Aug 2): Tanapag, Northern Mariana Islands (US-MP, seed 9e95b68a47a0d28082fc4d0185f47064) 52, 26, 14, 23, 22, 24, 20 (13.7% to 5.9%); Maloata, American Samoa (probe seed exit-b) 51, 32, 26, 40, 41, 36, 22 (14.1% to 6.8%); Staples, Connecticut (probe seed exit-a) 25, 29, 35, 38, 42, 48, 42 (5.9% to 10.4%). Found in the flows, watched weekly in the town (jobless people entering and leaving, by reason): entries after the first month are only layoffs (reason demand-below-staff), 3 to 9 a month in Tanapag, and the base rate is the national JOLTS rate, the same everywhere, while finding work is read against the state's own first-month rate (`workConditions`, src/core2/jobs-elsewhere.ts). Both hold the nation's rate, not the place's, so a place that opens above or below the nation's rate drifts to the nation's. The early high exits are the opening's seekers whose finding progress reaches one taking regional work (the town has almost no openings in its first ten weeks), with too few entries to replace them; a matched inflow holds the stock (the fix below holds Maloata at 45 to 65 of 56 with the pulls unchanged); the town that still settles lower than it opened (Tanapag) is the follow-up item jobs-opening-seats-more-jobless-than-its-flows-hold.

**Fix.** Built: `workConditions` also returns a separation scale, the odds of the state's first-review rate over the nation's (odds are separations over finds), and the town's turnover, the counted people working in the region and the lives elsewhere multiply the layoff rate by it. A place opening at the nation's rate gets one, so nothing moves there. The opening's pulls stay uniform. The pre-start run still reads each state against its own mean and is not changed.

**Time box.** 6 hours for one Opus session at high effort. When it runs out, push the measurements and what is found, set the state honestly with a one-line note, and stop.

**Rules.** No dice; sliding scales; real rates check totals and never pick one actor's outcome (`no-dice`, `labor-market-proof`). Speed: no year more than 20% slower.

**Done when.** A second session, not the builder, runs a test of a no-layoff year, a drawn place each, at Tanapag, Northern Mariana Islands, Maloata, American Samoa, Staples, Connecticut and one place nobody chose, and each month's unemployment stays within the band of its opening rate with the pool's monthly exit rate between 25 and 35%, read from the world-metrics months.

**Waits on.** Nothing.

**Files.** src/core2/jobs-elsewhere.ts, src/core2/modules/jobs.ts, src/core2/opening-jobless-stock.test.ts
