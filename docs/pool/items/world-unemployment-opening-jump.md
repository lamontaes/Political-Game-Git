---
id: world-unemployment-opening-jump
title: "A town's unemployment rate jumps in its first three months (2.1 to 5.1 percent, 5.7 to 10.0)"
area: world
kind: bug
priority: 2
size: M
status: dropped
claimed-by: claude/political-game-pool-3xfqef-2
pr: #4913
blocked-on: world-local-sales-below-opening-forecast
source: added with npm run pool -- add
claimed-at: 2026-10-19T22:23:51.875Z
---

**What.** A town's unemployment rate (seekers over employed plus seekers) climbs from about 4 percent in the first week to 11 to 14 percent by month six, against a start near the place's real rate. Find what pushes people out of work in the first months and fix the cause. The measurement in the notes shows the climb is layoffs, not search. The fix is the sales gap named in the notes.

**Rules.** No dice: a layoff follows a firm's own books and nothing else. One rule, all 56 places: the check names the place and seed it drew and tunes no seed.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, the unemployment rate stays within the place's sourced band through the first six months, and each layoff cites the firm record that caused it.

**Files.** src/core2/modules/jobs.ts, src/core2/modules/business.ts

**Notes.** Looked at Oct 17 (claude, claude/unemployment-opening-jump), not built: this is the visible side of `world-local-sales-below-opening-forecast`.

I measured seekers and employed through the first six months in three places drawn by seed (u1 to u3 through `drawPlace(seed, "unemp")`), the bench world with every module and two-level population:

| place                    | day 7 | day 30 | day 90 | day 180 |
| ------------------------ | ----- | ------ | ------ | ------- |
| Cottage Lake, Washington | 4.1%  | 8.0%   | 12.3%  | 13.9%   |
| Moapa Valley, Nevada     | 4.1%  | 7.0%   | 11.6%  | 12.5%   |
| Sayre, Pennsylvania      | 4.1%  | 7.0%   | 10.3%  | 11.6%   |

The seekers table is empty on day 0 and holds the opening's unemployed from the first week (4.1 percent in all three, the same count each time), so the first-week figure is the opening's own. The climb after it is layoffs: employed falls 3 to 5 percent while no position opens (at most one open position at any date), which is the shrink the sales gap causes (local-serving firms sell 35 to 65 percent below the demand their staff was sized for). Nothing in the hiring or search code limits it. Close this when `world-local-sales-below-opening-forecast` lands and the rate holds in the same three places.
