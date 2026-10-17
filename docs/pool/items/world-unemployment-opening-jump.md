---
id: world-unemployment-opening-jump
title: "A town's unemployment rate jumps in its first three months (2.1 to 5.1 percent, 5.7 to 10.0)"
area: world
kind: bug
priority: 2
size: M
status: in-pr
claimed-by: claude/unemployment-opening-jump
pr: #4913
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-17T12:19:12.850Z
---

**What.** In a played year (`buildBenchWorld`, two-level, bookkeeping off, 400 days) the town's monthly row in world-metrics shows the unemployment rate moving sharply in the first three months, then settling. Place 3800100 (seed `my2`): 2.1 percent in February 2025, 5.1 in May, 6.0 in August, 5.5 the next February; employed 282, 317, 315, 309. Place 3635155 (seed `my3`): 5.7, 10.0, 11.1, 10.4, 9.7 percent; employed 660, 654, 646, 630, 611. Place 4073100 (seed `my1`): 5.2, 7.4, 7.2, 5.4, 5.5. A real town does not add three to five points of unemployment in a quarter with nothing changing. Find whether the opening's first row counts the unemployed differently from later rows (seekers recorded late, the first row built from the opening target), or whether the jobs engine is separating workers faster than it hires in the first months, and make the first row and the steady state one measure.

**Rules.** One model, two tiers. No dice. The opening's figure comes from the same rule as every later month. One rule, all 56 places.

**Done when.** In a drawn place (name place and seed), the unemployment rate in month one and in month four differ by no more than the national series' own month-to-month spread in a quiet year, and the cause is named by record id (a seeker row, a separation, or the opening count).

**Files.** src/core2/modules/world-metrics.ts, src/core2/modules/jobs.ts

**Notes.** Found Oct 17 reading `months` rows of world-metrics every third month of a 400-day run. The employed counts in the same rows stay within about 10 percent, so the movement is in who is counted as unemployed. Related: world-unemployment-work-search, world-stopgap-jobs-missing-mechanic.

Read further Oct 17 (claude), place 3800100 (seed `my2`), the jobs `changes` table for the town's employers by month: February 2 quits; March 4 quits, 1 left-work, 2 hires; April 1 quit, 2 hires; no layoffs. The seekers table in the same town had 3 unemployed full people on day one, 9 on March 1 and 8 to 10 through May (counted seekers 0, then 4 to 7 unemployed); the first metrics row (February 2) counted 282 employed and 6 unemployed, March 2 counted 317 and 14. So two things move at once: the employed count jumps by 35 between the first and second row (counted jobs entering the wage flows in the first month), and the unemployed pool fills because people who quit enter it faster than hires take them out (7 quits and 1 left-work to 4 hires in three months). The opening starts the pool at the state rate; the flows settle it near double. The fix is in the flows' calibration (quit and hire rates against JOLTS, how long a seeker takes to be hired) and in the first row (build it from the same rows as later ones), not a tweak to the rate.
