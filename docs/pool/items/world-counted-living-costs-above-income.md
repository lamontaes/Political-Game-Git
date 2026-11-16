---
id: world-counted-living-costs-above-income
title: "In a well-off town the median counted household's living costs run above its wages and retirement, so half hold under a month of costs and dozens start looking for work on day two"
area: world
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after: counted-opening-savings-at-survey-median
blocked-on:
root: none
lead: money
model: opus
effort: medium
source: "T54's trace of the two away-workers reds left on the opening-savings fix, Nov 16 01:40Z (the Account lead's item 4: living costs at about twice pay; the lead's order that a red that stays red gets an item with its cause)"
---

**What.** At Staples CT (`drawPlace("probe-a", "exit-a")`, 1,500 people), with group-held savings (#9597) and the opening-savings fix, on day 2: the median counted household's living costs are $3,482 a month against $2,730 a month of wages and retirement income; 149 of 506 households have neither; of the 357 with income, 184 spend more than it and 27 more than twice it. The median household's cash and bank savings cover 1.00 month of its costs and 254 of 506 hold under a month. 35 counted people start looking for work on day 2 (20 jobless in all before #9117, 52 now), and 33 of their 35 households hold under a month counting savings (median 0.21 months). That leaves two tests red at Staples: `away-workers-turnover` (jobless 31 in December against a floor of half of February's 67) and `metrics-labor-force` (the tab's rate 2.16 times the region's on Jan 21). Both are red on the Train too, where 57 start looking. Seen: dev mode's trace of a counted household (the Money and Looking for work panels).

**Cause.** Needs cause. Found so far: the jobs engine's choice to look reads the household's days of money (`countedDaysOfMoney`, src/core2/modules/jobs.ts), correctly, and the households really are short. Staples is a well-off place, so wages near $33,000 a year for the median household point at the income side (what `wagesMinorYear` and `retirementMinorYear` hold for a counted household, and which earners or transfers they leave out, such as away workers' pay or Social Security), or at living costs set from a richer table than the income. Trace one household by id from the opening's draw to these two fields and to `livingCostDailyMinor`, against the town's survey income.

**Fix.** None until the cause is found.

**Time box.** 3 hours, Opus, medium.

**Rules.** One model, two tiers. Estimate, never unknown. Dev mode shows what the trace finds: the household's income parts beside its costs, on the Money panel.

**Done when.** The trace names, by household id, the step that sets a Staples household's income or costs apart from the survey, with its fix or its own item, and dev mode's Money panel shows the parts. A second session sees in dev mode, at a drawn place it names with its seed, a counted household whose costs and income stand as the town's survey says.

**Waits on.** Nothing.

**Files.** src/core2/residents.ts, src/core2/modules/jobs.ts, src/bench/dev-why.ts, src/core2/away-workers-turnover.test.ts, src/core2/metrics-labor-force.test.ts.
