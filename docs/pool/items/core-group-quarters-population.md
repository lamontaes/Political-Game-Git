---
id: core-group-quarters-population
title: "College dormitories, prisons, military quarters and nursing homes are housed as renting households, so a college town's students are evicted in large numbers (Storrs, Connecticut)"
area: core
kind: feature
priority: 1
size: M
status: claimed
claimed-by: speed/group-quarters-population
pr:
blocked-on:
after: world-group-quarters-research
source: added with npm run pool -- add
claimed-at: 2026-11-01T20:14:04.336Z
---

**What.** The residents engine places every resident in a household that rents or owns. A place's group-quarters residents (students in college housing, people in prison, service members in barracks, nursing-home residents) are instead housed by their institution and do not enter the rental market. Without them, Storrs, Connecticut's students seem to rent at their own incomes, fall behind and are evicted in large numbers, which also fills in thousands of full people (see core-evicted-counted-stays-counted). The counts come from world-group-quarters-research.

**Rules.** Simulate it, don't ask (owner, Oct 24): group quarters are a real-life population the background simulation lacks, built from research and calibrated, never hardcoded. One model, two tiers: group-quarters residents are counted groups read by the same rules as everyone else, times their count, outside the rental market. One rule, all 56 places: counts come from data by place.

**Done when.** In a one-year run of the played world (buildBenchWorld) in Storrs, Connecticut (key 0973980) and two places drawn from all 56, place and seed named, the group-quarters residents the research file gives for the place live outside the rental market (no lease, no rent arrears, no eviction case), by residents record id; Storrs's eviction filings per 100 renter households over the year fall within the Eviction Lab range the housing parameters cite; and a test in src/core2 proves it.

**Files.** src/core2/modules/residents.ts, src/core2/residents.ts, src/core2/housing-homeless.ts

**Notes.** Lead: speed (CTO, Nov 1).

Nov 2, 01:20 UTC (speed lead, handoff record; the first account is near its weekly limit): branch speed/group-quarters-population, head f8d3f1dc45, built, reviewed twice and fixed; the measure step (a zero-group-quarters place's one-year proof against main, and Storrs's year on main and the branch) is running. Research done: Eviction Lab state filing rates (national 7.80 per 100 renter households, 2018; Connecticut 3.98; 51 states 0.65 to 69.58, Maryland an outlier by law; households with a filing: national 5.83, Connecticut 3.87). Next: check which band the test uses; the speed lead's plan is the households-with-a-filing measure with a 10th to 90th percentile state band, Maryland named as the outlier; then PR, checker.
