---
id: traits-plan-child-weight-recentered
title: "Planning a child weighs temperament at its study's size without changing how many couples plan one"
area: people
kind: wiring
priority: 2
size: S
status: dropped
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: traits
model: sonnet
effort: medium
root: none
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** A couple's case for planning a child (src/core2/births-plan.ts) sits 3.6 to 18.3 below waiting in nine of ten reviews, while temperament spans about plus or minus 0.4, so at the general weight it turns no one. In Haledon, New Jersey (place key 3429070, seed fc8bf1311d0f) scripts/traits/trait-calibrate.ts fits a weight of 7.05 to reach odds of 1.74 between the thirds against Jokela et al.'s 1.93, but at that weight the share of reviews that plan a child rises from 1.8% to 2.6%, about 40% more births. Re-center the waiting side so the share stays where the births rate puts it, then set the weight.

**Cause.** Measured: scripts/traits/trait-calibrate.ts in Haledon, New Jersey (place key 3429070, seed fc8bf1311d0f): the plan-child case in src/core2/births-plan.ts sits 3.6 to 18.3 below waiting in nine of ten reviews; a weight of 7.05 reaches odds 1.74 (study 1.93) but raises the planning share from 1.8% to 2.6%, about 40% more births. The gap row renewal.plan-child in data/content/trait-decision-gaps.json still cites this item.

**Fix.** In src/core2/births-plan.ts re-center the waiting side by a parameter (not a cutoff) so the planning share stays where the births rate puts it, then set the weight from the row in data/research/trait-effect-sizes.json.

**Time box.** 4 hours for one Sonnet session.

**Rules.** No dice: the plan stays a weighed choice. Never loosen a check: the births rate the opening and the year are checked against stays the target. Sliding scales: the waiting side's shift is a parameter, not a cutoff. Research before building: the weight comes from the rows in data/research/trait-effect-sizes.json.

**Done when.** A second session plays one year of buildBenchWorld in two places drawn from all 56 (seeds named) and sees the odds between the thirds for renewal.plan-child reported beside the study's 1.93, the share of reviews that plan a child equal to the same place's share at the general weight (both reported), and the year's births still passing their existing births-rate check.

**Waits on.** Nothing.

**Files.** src/core2/births-plan.ts, src/core2/data/parameters.json, data/content/trait-decision-gaps.json, scripts/traits/trait-calibrate.ts

**Notes.** Filed Oct 25 by the traits lead from traits-research-weights-21.

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have set the child-planning temperament weight to a study's size; no player sees it, and births are kept on their own items.
