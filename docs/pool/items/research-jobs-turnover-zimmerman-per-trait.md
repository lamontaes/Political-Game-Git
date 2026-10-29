---
id: research-jobs-turnover-zimmerman-per-trait
title: "Looking for work, quitting, taking an offer and firing weigh temperament at Zimmerman's per-trait turnover sizes"
area: people
kind: research
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Seven job decisions keep the general trait weight of 1 because only the text of Zimmerman 2008 (Personnel Psychology 61(2), a meta-analysis of personality and turnover) without its numbers was read: starting to look, accepting an offer, reviewing a worker, and the counted workers' looking, accepting, applying and retiring. The paper's tables give each Big Five trait's corrected correlation with turnover intentions and with actual turnover. Read them from the paper, record the rows in data/research/trait-effect-sizes.json with quotes, add a retirement-timing source if one exists, and fit each weight to its row on played years.

**Rules.** Research before building: research calibrates the simulation and never decides one worker's outcome. Quote the table cells from a fetched copy of the paper. One model, two tiers: a counted worker reads the same weight as a full one, times their count. One rule, all 56 places: fit on places drawn from all 56, seeds named.

**Done when.** data/research/trait-effect-sizes.json carries per-trait rows for these decisions with quoted table cells; each weight is ESTIMATED from them with its spread, or keeps 1 with a gap row naming why; in two drawn places' played years, seeds named, each fitted decision's net odds between the thirds of lean sit within a factor of 1.5 of its study's; the money trait tests pass.

**Files.** data/research/trait-effect-sizes.json, src/core2/data/parameters.json, data/content/trait-decision-gaps.json, src/core2/money-traits.traits.test.ts

**Notes.** TODO
