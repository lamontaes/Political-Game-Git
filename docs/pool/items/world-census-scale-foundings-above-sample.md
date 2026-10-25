---
id: world-census-scale-foundings-above-sample
title: "Washington, D.C. at its Census size founds 6 businesses in a year against 1 at the sample size"
area: world
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
after: world-census-scale-closures-large-cities
source: added with npm run pool -- add
---

**What.** Washington, D.C. (1150000, seed dc-closures-a) opened at 69 times its sample founds six businesses in a year (inns, construction, a restaurant, retail, information), while the same city at the sample size founds one inn. None of the six closes, after the PR for world-census-scale-closures-large-cities stopped filled-in households and full owners keeping money that stood for many households. Find which founding reason reads a weighted figure against an unweighted one (the growers' cash against a cushion from the book payroll, a counted candidate's cash and savings against the startup cost, or the prospect against the median pay) and weight it.

**Rules.** One model, two tiers: every founding reason reads its money and the book at the same weight. No dice: a business is founded from its founder's reasons and the market's room, never a monthly chance.

**Done when.** In Washington, D.C. at its Census size and one more drawn place above 100,000 (seeds named), a year's foundings in buildBenchWorld are within the same town's count at the sample size plus its spread, listed by founding record id, shown by a test in src/core2 beside census-scale-closures-large-cities.test.ts.

**Files.** src/core2/modules/business.ts

**Notes.** TODO
