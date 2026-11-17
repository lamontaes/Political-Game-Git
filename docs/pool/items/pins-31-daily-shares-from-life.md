---
id: pins-31-daily-shares-from-life
title: "Pins family 31: the day's small shares (reserved hours, time at home, counted giving, wills) come from each person's own life"
area: world
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by: pins
pr:
after:
blocked-on:
root: none
lead: pins
model: opus
effort: high
source: "CTO, LIFT THE PINS, #9747 comments 6936897718 and 6936902790 (family 31); Pins claim 6937058589 and plan 6937517874"
---

**What.** Four of the day's small shares were copied from published figures into every world. Each person's spare hours were ATUS hours by age, housemates shared a fixed 243 or 43 minutes a day, counted givers were 49.6% of adults, and a will came from an age midpoint of 50. Seen: the CTO's audit of main c5808caa, family 31.

**Cause.** Found in code: `reserveHours` in src/core2/free-block.ts read ATUS by age times a world factor; `shareHomeTime` in src/core2/modules/people.ts and `openingClosenessHours` in src/core2/closeness.ts read householdFamilyMinutesPerDay and householdOtherMinutesPerDay; `raiseFromCounted` in src/core2/modules/drives.ts read countedGivingShare; `willOf` in src/core2/estates.ts read willAgeMidpointYears.

**Fix.** The reserve is the person's own upkeep plus their share of their home's (`homeUpkeep`). Housemates' minutes are the shorter of their two home days after their own work weeks, times a presence share fitted once (`homeTogether`). Counted adults give as the full members did that month. A will follows the months of living cost saved and the partner and children left, less its bother (`willReasons`). The player sees it in dev mode's Trace box on `home-time:<household>`, `counted-giving:<group>` and the probate row.

**Time box.** 6 hours, Opus, high.

**Rules.** One model, two tiers: the counted adults give by the same rule as the full members, times their count. Sliding scales and causes: every share moves with homes, jobs, savings and family, with no threshold.

**Done when.** A second session plays a year in a drawn place it names with its seed, with dev mode on, opens `home-time:<household>` and `counted-giving:<group>` in the Trace box, and sees each pair's home minutes and the month's givers. It also sees two homes of different sizes reserve different hours.

**Waits on.** Nothing.

**Files.** src/core2/free-block.ts, src/core2/closeness.ts, src/core2/modules/people.ts, src/core2/modules/drives.ts, src/core2/estates.ts, src/core2/data/parameters.json, src/core2/daily-shares-own-causes.test.ts, scripts/core2-year/pins-31-proof.ts.
