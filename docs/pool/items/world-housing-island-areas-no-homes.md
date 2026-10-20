---
id: world-housing-island-areas-no-homes
title: "Island-area towns (Guam, American Samoa, Northern Marianas, Virgin Islands) open with no homes because their place code is not a county code"
area: world
kind: bug
priority: 2
size: S
status: in-pr
claimed-by:
pr: #5646
blocked-on:
source: added with npm run pool -- add
---

**What.** The housing opening takes a place's county from its 7-digit Census place code, or uses the place code itself as the county. Island-area towns carry a 10-digit code, so it was used as a county, no tenure or rent row matched, and the nation fallback written for the island areas (county starting with nation) never ran. The town opened with zero dwellings, no landlord, no leases and no property tax. Found by housing-no-opening-value.test.ts in Tamuning, Guam (seed 600668ed026fc5bd), whose probe world had no landlord organization.

**Rules.** One rule, all 56 places: island areas follow the same housing opening as any town, on the nation's figures marked as estimates (SG-WORLD-housing-island-areas). Estimate, never UNKNOWN: a home value and rent start from the nation's average with its source. Replace, never layer: the county lookup is corrected, not wrapped with a Guam exception.

**Done when.** housing-no-opening-value.test.ts passes with seed 600668ed026fc5bd (Tamuning, Guam) and on a fresh drawn world, with the town opening dwellings, a landlord and leases named by record id, and housing-opening, housing-readers and housing-county-estimate still pass.

**Files.** src/core2/modules/housing.ts, src/core2/housing-no-opening-value.test.ts

**Notes.** TODO
