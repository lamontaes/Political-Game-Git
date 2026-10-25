---
id: core-opening-public-buyers-sourced-reads
title: "Opening public custodial buyers read the 2021 county listing and their state's government-type shares"
area: core
kind: feature
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The opening's public custodial budgets still use one national buyer coverage (0.80) and carry each county's identity forward from the 2017 listing. Make the opening read, for each place, which kinds of general-purpose government are its recorded buyers and give each the state's own share of local public-building spending from data/research/core/census-2022-local-public-buildings-by-government-type.json (the county share where only the county buys, all of it where the place's own government also buys). Make the county owner check also read the Census 2021 Government Units listing (units active in the fiscal year that contains the opening) as the opening-dated observation matched by PID6 and GID, and compare names without punctuation so the one county whose 2017 name lacks its apostrophe is accepted.

**Rules.** One rule, all 56 places: the shares come from the per-state table in data, territories at its median, and no state is named in logic. Sliding scales and causes: the share scales the budget smoothly, never a cutoff. An effect is a read, not a record: the public custodial contract and its payments to the building-services firm must move with the new share.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place with a building-services firm, place and seed named in the PR body), each public custodial agreement's monthly budget equals the state's share for its buyer type times the place's public-building spending, shown by agreement and payment record ids; a test in src/core2/opening-customers.test.ts covers a county-only buyer and a county-plus-municipal pair; SG-P8-opening-public-owner-history and SG-P8-opening-public-owner-coverage are resolved in src/core2/data/stopgaps.json.

**Files.** src/core2/opening-customers.ts, src/core2/opening-public-owner.ts, src/core2/data/opening-customers.json, src/core2/data/stopgaps.json, data/research/core/census-2022-local-public-buildings-by-government-type.json, data/research/core/census-gus-2021-county-identity-continuity.json

**Notes.** TODO
