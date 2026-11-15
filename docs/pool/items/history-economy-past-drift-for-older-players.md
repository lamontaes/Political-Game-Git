---
id: history-economy-past-drift-for-older-players
title: "A player born before about 2007 reaches back far enough that past pay drifts more than 15% from the published path (about 30% by 1990): decide whether that is the world's offsets as designed or something to bound"
area: world
kind: research
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after: history-economy-past-is-this-worlds
blocked-on:
lead: money
model: opus
effort: medium
root: design-one-model-two-tiers
checked: Account lead 2026-11-14
source: Account lead T48 on #9089, measured in three drawn places
---

**What.** Since #9089, every month of the economy before the start is the published month moved by the world's offsets, and a growth offset compounds from the opening month back over the whole window (the Account lead's ruling on the plan). The window starts in the player's birth year. For a default player (born about 2007) the largest gap between a past wage and the published path was 9.8% (Quail Ridge FL), 13.0% (Trenton UT) and 11.3% (Clarksburg WV). An older player, from an Advanced start or a test's 35-year-old, reaches further back: the wage-growth spread is at most 0.8 points a year, so the gap reaches about 30% by 1990 (1.008 to the 35th power is 1.32). Seen: a person's past jobs in the Journal and their history, priced from these months.

**Cause.** Measured: at Trenton UT (key 4977230), seed 7e3fe2d09c9fefa1a561aee66a6fb893b275fe8261f2fe6c8cbac48600b355f1, the largest gap over a window from 2006 was 13.0%; src/core2/macro-model.ts `moveByWorld` multiplies a month's pay by (1 + wage-growth points / 100) to the power of the years from the opening month, the same rule `historyMonths` uses for its 13 or more months. The spread `macroWorldWageGrowthSpreadPoints` (0.8, ESTIMATED) is calibrated on 12-month changes, not on how far a country's path can drift over decades. Nothing bounds the compounding. The other growth offsets (prices, payroll jobs, output) compound the same way.

**Fix.** A design call, not made here. Either: (a) keep it, since a world whose wages grew 0.8 points a year faster for 35 years is a different but realistic country, and say so in the parameter's citation; or (b) bound it with a sourced long-horizon spread, so the drift grows with the square root of the years rather than with the years (researcher); or (c) compound only back to the latest full-data year and hold the ratio before it.

**Time box.** 2 hours for the decision and its research; 1 hour to build (b) or (c).

**Rules.** History is simulated before the start (owner, Oct 27; Nov 13). Real data calibrates and is never the figure. One rule for the past and the opening months: whichever choice is made changes `moveByWorld`, so both callers move together.

**Done when.** A second session starts a new life with an older player at a drawn place and sees past pay in a person's history that follows the chosen rule. The choice is recorded with its reason in the parameter table's citation or in `moveByWorld`; in a world with a 35-year-old player at a drawn place (name place and seed), the largest gap of a past wage from the published ratio is printed and matches that choice.

**Waits on.** Nothing.

**Files.** src/core2/macro-model.ts, src/core2/data/macro/parameters.json

**Notes.** Filed by Account lead T48 from #9089 at the Account lead's request; not picked.
