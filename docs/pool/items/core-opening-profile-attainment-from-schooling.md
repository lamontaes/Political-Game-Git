---
id: core-opening-profile-attainment-from-schooling
title: "Opening education and faith come from the person's own past, checked against the census and the Religious Landscape Study"
area: core
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Each adult's education and faith at the opening is read from their state's CES 2024 survey shares by age band (src/core2/opening-profile.ts, SG-P15-opening-profile), so a person's degree ignores their own schooling record and their faith ignores the family they grew up in. Derive attainment from the person's deep past and household records, and faith from the household they were raised in, following the approved per-person faith record (handed down in families, changing only through events; DECISION-REGISTER.md). Check the town's totals against data/research/core/acs-2023-b15001-attainment-by-state.json (ACS 2019-2023 B15001 by state, age and sex) and data/research/core/pew-rls-2023-24-faith-by-state.json (Pew 2023-24 by state), both covering all 56 places. In the Owings, Maryland year (seed 38e6252af62e) the 83 adults of the town were 28.9% Protestant against the Pew Maryland share of 43.3%, because the CES Maryland shares run lower, and across all 1,729 full adults the share with a bachelor degree or more ran 4 to 6 points under the ACS at ages 25 to 44.

**Rules.** No dice: the census and Pew shares check the town's totals and never become a draw for one person; a person's attainment and faith follow their own schooling record and household. One rule, all 56 places: both check tables are keyed by postal code for every place, never a state named in logic.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place and a seed the builder did not choose, named in the PR), the share of full adults with a bachelor's degree or more in each ACS age band with at least 30 adults lands within 5 points of the state's B15001 share, and each faith group within 5 points of the Pew state share, printed by scripts/research/deep-past-year.ts with the person record ids it read.

**Files.** src/core2/opening-profile.ts,src/core2/deep-past.ts,data/research/core/acs-2023-b15001-attainment-by-state.json,data/research/core/pew-rls-2023-24-faith-by-state.json

**Notes.** TODO
