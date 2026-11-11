---
id: research-jobs-turnover-zimmerman-per-trait
title: "Looking for work, quitting, taking an offer and firing weigh temperament at Zimmerman's per-trait turnover sizes"
area: people
kind: research
priority: 2
size: M
status: dropped
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
standard: 2
model: sonnet
effort: medium
root: none
lead: traits
after:
checked: fable 2026-11-10
---

**What.** Seven job decisions keep the general trait weight of 1 because only the text of Zimmerman 2008 (Personnel Psychology 61(2), a meta-analysis of personality and turnover) without its numbers was read: starting to look, accepting an offer, reviewing a worker, and the counted workers' looking, accepting, applying and retiring. The paper's tables give each Big Five trait's corrected correlation with turnover intentions and with actual turnover. Read them from the paper, record the rows in data/research/trait-effect-sizes.json with quotes, add a retirement-timing source if one exists, and fit each weight to its row on played years.

**Cause.** Found in code: data/content/trait-decision-gaps.json lists the job decisions (`jobs.start-looking`, `jobs.accept-offer`, `jobs.review-worker`, `jobs.counted-accept` and the counted looking, applying and retiring) at the general weight, with reasons that cite Zimmerman 2008's text only; each reads the general `traitWeight` of 1 (src/core2/data/parameters.json).

**Fix.** Read the paper's tables of each trait's corrected correlation with turnover intention and turnover, record them in data/research/trait-effect-sizes.json with quotes, and set per-trait weights in src/core2/data/parameters.json; a counted worker reads the same weight times count. A decision the paper does not size keeps 1 with a gap row naming why.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** Research before building: research calibrates the simulation and never decides one worker's outcome; quote the table cells from a fetched copy of the paper. One model, two tiers: a counted worker reads the same weight as a full one, times their count. One rule, all 56 places: fit on places drawn from all 56, seeds named.

**Done when.** A second session plays a year in two drawn places (seeds named in the PR) and sees, by record id, that for each fitted decision the less emotionally stable and less conscientious thirds of workers start looking, quit or accept offers more often in the direction of the paper's rows, with the ratio reported next to the study's and not as a pass mark. data/research/trait-effect-sizes.json carries per-trait rows with quoted table cells, each weight is ESTIMATED with its spread or keeps 1 with a gap row naming why, and the money trait tests pass.

**Waits on.** Nothing.

**Files.** data/research/trait-effect-sizes.json, src/core2/data/parameters.json, data/content/trait-decision-gaps.json, src/core2/money-traits.traits.test.ts

**Notes.** TODO

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have fitted seven job-decision trait weights to one study; precision no player sees.
