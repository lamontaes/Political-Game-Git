---
id: world-housing-island-areas-sourced
title: "The four island areas with no ACS housing table start from their own Census 2020 tenure, rent and home value"
area: world
kind: research
priority: 2
size: S
status: in-pr
claimed-by: claude/housing-island-areas
pr: #5431
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T02:23:10.145Z
---

**What.** American Samoa, Guam, the Northern Marianas and the Virgin Islands have no ACS tenure or rent table, so the housing engine starts them from the nation's owner share and household-weighted county medians (SG-WORLD-housing-island-areas). The Census Bureau's 2020 Island Areas Censuses give each its own owner share, median monthly gross rent and median home value. Put those four rows in the housing data with their citations, read them where the engine now reads the nation's, date the home values to April 2020 so the price index moves them to the start, and resolve the stopgap row.

**Rules.** Research before building: the figures calibrate a place's starting mix and never decide one household's tenure. Estimate, never UNKNOWN: each row names its source and a spread. One rule, all 56 places: the rows are data keyed by the place's state key, never a territory named in logic.

**Done when.** In a one-year played world (buildBenchWorld) in a territory drawn by seed from the four island areas, the town's owner share is within one point of its Census row, owners' median value is that row's value moved from April 2020, renters' rent is its row, `SG-WORLD-housing-island-areas` is resolved in src/core2/data/stopgaps.json, and a test in src/core2/housing.test.ts names the place and seed.

**Files.** src/core2/modules/housing.ts, src/core2/data/housing/housing.json, src/core2/data/stopgaps.json, src/core2/housing.test.ts

**Notes.** Figures read Oct 20 from the Census Bureau's July 20, 2023 release pages for each island area (2020 DHC): Guam owners 52.0 percent of occupied, median value $277,800, rent $1,057; American Samoa owners 71.1 percent, value $84,400, rent $601; Northern Marianas owners 29.0 percent, value $184,200, rent $502; Virgin Islands owners 47.8 percent, value $290,600, rent $926.
