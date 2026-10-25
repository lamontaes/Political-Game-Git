---
id: traits-plan-child-weight-recentered
title: "Planning a child weighs temperament at its study's size without changing how many couples plan one"
area: people
kind: wiring
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** A couple's case for planning a child (src/core2/births-plan.ts) sits 3.6 to 18.3 below waiting in nine of ten reviews, while temperament spans about plus or minus 0.4, so at the general weight it turns no one. In Haledon, New Jersey (place key 3429070, seed fc8bf1311d0f) scripts/traits/trait-calibrate.ts fits a weight of 7.05 to reach odds of 1.74 between the thirds against Jokela et al.'s 1.93, but at that weight the share of reviews that plan a child rises from 1.8% to 2.6%, about 40% more births. Re-center the waiting side so the share stays where the births rate puts it, then set the weight.

**Rules.** No dice: the plan stays a weighed choice. Never loosen a check: the births rate the opening and the year are checked against stays the target. Sliding scales: the waiting side's shift is a parameter, not a cutoff. Research before building: the weight comes from the rows in data/research/trait-effect-sizes.json.

**Done when.** In one year of buildBenchWorld in two places drawn from all 56, seeds named, renewal.plan-child reaches net odds from 1.2 to 3.9 between the thirds, the share of reviews that plan a child is within 10% of the same place's share at the general weight, and births in the year stay inside their checked band.

**Files.** src/core2/births-plan.ts, src/core2/data/parameters.json, data/content/trait-decision-gaps.json

**Notes.** Filed Oct 25 by the traits lead from traits-research-weights-21.
