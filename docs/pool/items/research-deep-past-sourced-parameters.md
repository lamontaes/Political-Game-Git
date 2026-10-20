---
id: research-deep-past-sourced-parameters
title: "Research: sourced parameters for the deep past, peer networks, profiles and partnerships"
area: core
kind: research
priority: 2
size: M
status: blocked
claimed-by:
pr:
blocked-on:
source: "collapsed Oct 19, 2026 from art-stopgap-opening-partnership-estimated-behavior, core-stopgap-civic-inputs-civic-data-vintage-and-permission, core-stopgap-deep-past-generated-history-proxy, core-stopgap-deep-past-shared-past-generation-gap, core-stopgap-opening-peer-network-generated-historical-social-prior, core-stopgap-opening-profile-partial-model"
---

**What.** Apply the sourced rows in docs/research/pool-feeder-oct20/research-deep-past-sourced-parameters.md to the parameter table(s) and data files for sourced parameters for the deep past, peer networks, profiles and partnerships. Each row already carries a value, a low and high spread, a tag (SOURCED or ESTIMATED) and a citation, so the builder enters them, adds a reader for each research file, and resolves these stopgap rows in src/core2/data/stopgaps.json: SG-P15-partnership-model, SG-P8-civic-inputs, SG-P8-deep-past, SG-P15-kin-light-past, SG-P8-opening-peer-network, SG-P15-opening-profile. Rows tagged mechanic name a change the area's builder makes to read the sourced inputs; build the simplest version and register what remains.

Rows:

- `SG-P15-partnership-model` in src/core2/opening-partnership.ts: Opening household members are aged from the place's records by household type: the chance of having a partner now comes from a yearly chain of first marriage (ACS 2024 never-married shares by age), divorce (NSFG women's first-marriage survival, used for every marriage), widowhood (SSA 2023 life table, with the spouse's age from the CPS 2023 spouse age ...
- `SG-P8-civic-inputs` in src/core2/data/civic-inputs.json: Current indexed institution and canonical generated employer classifications stand in for historical public directories. Replacement: Era-specific directories with explicit institution access, membership and authority records.
- `SG-P8-deep-past` in src/core2/data/deep-past.json: Generated summarized school cohorts reuse common grade stages, present institution names and current-locality proxies where past places are unrecorded; this is not sourced personal attendance or historical institution existence. Replacement: Era- and locality-specific sourced institution histories and validated cohort distributions; preserve existing personal fact...
- `SG-P15-kin-light-past` in src/core2/deep-past.ts: Relatives living outside the town (husk-tier kin) keep only their family and move facts at the opening; their own schooling, work and era history is not generated. Replacement: Generate a relative's deep past when the game first simulates them (promotion from husk tier), from the same deep-past rules residents use.
- `SG-P8-opening-peer-network` in src/core2/data/opening-peer-network.json: Who became acquainted in an estimated historical school cohort and who still remembers the other's name. Replacement: Admit sourced personal acquaintance histories where available; otherwise calibrate explicit generated school/community social priors and recognition persistence against appropriate network/cohort observables, retaining source ...
- `SG-P15-opening-profile` in src/core2/opening-profile.ts: Each adult's education and faith at the opening, read from their state's CES 2024 shares by age band with a household share; education and faith are treated as independent within a state and age band, and children carry no attainment. Replacement: Attainment from the person's own schooling history (deep past) checked against ACS B15001 by state, age and sex;...

**Rules.** Research before building: the sourced figures calibrate the totals the proof reports and never decide what one person does. Estimate, never UNKNOWN: any value without a measure keeps its ESTIMATED tag, source and spread. One rule, all 56 places: place values live in data keyed by place code, never named in logic, and the proof draws a random place. No dice: no seeded roll or fixed percentage picks an actor's outcome; causes and records do.

**Done when.** Each row is SOURCED or ESTIMATED in its parameter table with a citation and a spread, the stopgap rows above are resolved in src/core2/data/stopgaps.json (or kept with a reason), the research-data reader guard and the tripwire test pass, and a one-year played world (buildBenchWorld, a place drawn from all 56, seed named) reports each band and where the town landed against it.

**Files.** src/core2/data/civic-inputs.json, src/core2/data/deep-past.json, src/core2/data/opening-peer-network.json, src/core2/deep-past.ts, src/core2/opening-partnership.ts, src/core2/opening-profile.ts, src/core2/data/parameters.json, src/core2/data/stopgaps.json, data/research/core/

**Notes.** Folded from: art-stopgap-opening-partnership-estimated-behavior, core-stopgap-civic-inputs-civic-data-vintage-and-permission, core-stopgap-deep-past-generated-history-proxy, core-stopgap-deep-past-shared-past-generation-gap, core-stopgap-opening-peer-network-generated-historical-social-prior, core-stopgap-opening-profile-partial-model. Rows that are not numbers (missing mechanics in law reach, for example) stay registered; this item sources what they will read.

Oct 20 (pool feeder): research done in docs/research/pool-feeder-oct20/research-deep-past-sourced-parameters.md (6 rows: 0 sourced, 4 estimated, 2 mechanic).
