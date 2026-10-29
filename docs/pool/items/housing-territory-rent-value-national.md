---
id: housing-territory-rent-value-national
title: "Puerto Rico towns get U.S. national rent and home value, not their municipio's medians"
area: world
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** housing.ts townOf gives a Puerto Rico place the county nation:PR because countyPopulationSharesForPlace returns nothing for its 7-digit geoid, so rentValueOf falls through to NATIONAL.rentValue ($1,418 rent, $393,149 value). The 78 municipio medians in housing.json countyRentValue (72xxx) are never read. Roadmap M1-05's check fails on it in Lomas, Puerto Rico (key 7246626, seed 591a7dea70e8601ff33ba68cdc050acfd4eee1b0b96f73c00c9606d9e7decf31): rent $913.75 against municipio medians $349 to $901, value $432,494 against $86,500 to $226,800.

**Rules.** One rule, all 56 places: a territory place reads its own county-equivalent medians through the same lookup as a state's county, never a named territory branch.

**Done when.** node --max-old-space-size=8192 --import tsx src/core2/tooling/m1-05-check.ts with GOLDEN_PATH_SEED and GOLDEN_PATH_PLACE_KEY for Lomas, Puerto Rico (above) passes its rent and value clauses, and a drawn place in another territory with county-equivalent data passes them too, named with seeds in the PR body. **On screen.** Nothing yet: it would show on Who you are and News, and nothing there reads it.

**Files.** src/core2/modules/housing.ts, src/core2/data/housing/housing.json

**Notes.** TODO
