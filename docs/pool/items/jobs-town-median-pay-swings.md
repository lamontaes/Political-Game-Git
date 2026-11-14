---
id: jobs-town-median-pay-swings
title: "A town's median pay at its own firms falls a quarter in two years and comes back, or stays flat for fourteen years"
area: world
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: jobs
model: opus
effort: medium
root: none
checked: Account lead T49 2026-11-14
source: Account lead T49 building world-home-prices-from-housing (Nov 14, 2026)
---

**What.** The home price level (world-home-prices-from-housing, #9104) reads each town's median monthly pay at the jobs of firms in the town (`townPayByPlace` in src/core2/modules/housing.ts), smoothed over a year and indexed to day one. In two played towns that pay moves in a way no real town's does. In Bloomingdale it falls about a quarter in two years and comes back exactly. In Bastrop it does not move at all for fourteen years while the economy's pay rises, then climbs 40% in six. Whatever reads the town's pay sees the same swings: home prices, Metrics' pay figures and the housing town figures. Seen: Metrics' pay figures and typical home value in a played town over several years.

**Cause.** Measured: `node --max-old-space-size=8192 --import tsx scripts/research/home-price-paths.ts --seed e5 --place 3406340 --years 30` (Bloomingdale, New Jersey, world seed e0251414…, start 2025-01-20). The smoothed pay index at each January from 2026 was 1.000, 0.826, 0.729, 0.856, 0.949, 0.982, 0.994, 0.998, 0.999, 1.000 and 1.000. The smoothing weights a month at 1/12, so the raw median fell further than 27% and for at least a year. With `--seed c3 --place 2204685` (Bastrop, Louisiana), the index was exactly 1.000 at every January through 2039, then 1.030, 1.065, 1.096, 1.114, 1.127, 1.295, 1.408, 1.535, 1.630, 1.981 and 3.657 (2040 to 2050): the town's median pay at its own firms more than tripled in eleven years, with the economy's rate flat near 5.1%. The run ran out of memory (6 GB heap) after 2050. The firms that moved it are not yet traced. What the numbers suggest, not yet checked: the index returns to exactly 1.000, so a town's median sits on one wage shared by many jobs (an occupation's or a firm's posted wage). It moves only when the jobs' mix shifts across that wage, and wages at a town's firms do not rise with the economy's pay. If so, the median jumps between a few wage levels instead of drifting.

**Fix.** Trace it first. Advance Bloomingdale (seed e5) month by month through 2027-2028, and at each month list the town's open jobs by firm and wage: the median, the count at the median wage, and which firms hired or let go. If wages at a town's firms never move with the economy's pay, that is the jobs engine's wage step. Fix it there (one engine). If the median sits on one wage shared by many jobs, the price rule may need a smoother read of the same jobs (a mean, or a wider middle), decided with the Account lead. Prices follow whatever the fix gives.

**Time box.** 4 hours for one session of the Opus model, the trace first. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One engine per mechanic: a wage fault is fixed in the jobs engine's wage step, and every reader of the town's pay gets the same fix. No dice: a firm's pay moves with its own revenue, the labor market and the economy's pay, never by a roll. One rule, all 56 places: the check draws its places from all 56.

**Done when.** A second session plays a drawn place for ten years in dev mode and sees Metrics' pay figures move year to year with the town's firms. At three drawn places over ten unattended years, a town's median pay at its own firms moves year to year with its firms' hiring and the economy's pay, never stuck at exactly day one's for years and never down a quarter and back within three years, unless a named firm's closing or opening explains it. The table is in the PR body.

**Waits on.** Nothing.

**Files.** src/core2/modules/jobs.ts (wages), src/core2/modules/housing.ts (`townPayByPlace`)
