---
id: world-resident-spending-follows-income
title: "Town households spend a fixed basket at any income, so a well-paid household saves most of its pay"
area: world
kind: bug
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: "asked for by the Account lead on the owner-cash fix: no resident path scales spending with income, Nov 14"
claimed-at:
after:
lead: account-lead
model: opus
effort: medium
root: rc9-place-facts-one-default
checked: sonnet 2026-11-14
---

**What.** A household living in the town spends the region's basket for its size plus a rent at every income, so a household with two good earners keeps most of what it earns, the same fault officials had before the owner-cash fix. Real households spend more as they earn more, and the Consumer Expenditure Survey says by how much. Seen: a year-1 run in a drawn town shows households with the highest wages holding the most cash at the end of the year and a median saving rate near the national one.

**Cause.** Found in code: `householdDailyCostMinor` in `src/core2/household-cost.ts` is called for town households at `src/core2/population.ts` (the household cost around line 1395) and for kin (around line 1927) without a pay, so it returns the basket. The function already spends by pay when given `annualPayMinor` (used for officials in `officialHousehold`).

**Fix.** Design: pass each town household's yearly wages to `householdDailyCostMinor` where the opening costs it, and where a household's income changes (a job, a raise, a layoff) recost it; then measure year 1 and three years at three places with and without (median cash, delinquency, foreclosures, business sales), since this changes every town. Read the cost-of-living writers first so a second copy is not made.

**Time box.** 3 hours for one Opus session at medium effort. When it runs out, write what was seen in the item and stop.

**Rules.** Wire to the world: a household's spending moves money to the businesses and landlords that sell to it; one model, two tiers: the counted households use the same rule times their count; no dice.

**Done when.** A second session, not the builder, runs a one-year played world (buildBenchWorld) at a drawn place and seed it names, and sees the saving rate of the top wage households below 30 percent of their pay, the median owner cash inside four times its start, and delinquency not above its pre-change level plus 10 percent, with record ids of the households read.

**Waits on.** The owner-cash fix folding.

**Files.** src/core2/household-cost.ts; src/core2/population.ts; src/core2/modules/residents.ts

**Notes.** The curve and its four rows are in `src/core2/data/parameters.json` (`householdSpending*`); their figures are recalled, not yet checked (research-official-spending-by-pay).
