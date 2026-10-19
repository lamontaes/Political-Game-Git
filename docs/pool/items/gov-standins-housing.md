---
id: gov-standins-housing
title: "Housing-engine stand-ins replaced or relabeled as sourced estimates"
area: world
kind: stopgap
priority: 2
size: M
status: claimed
claimed-by: claude/political-game-pool-v8txtd
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T22:19:12.591Z
---

**What.** The housing engine's stand-ins are replaced or relabeled as sourced estimates. This pass replaces the county-median stand-in: a county the ACS withholds a median rent or home value for now reads its neighboring counties' household-weighted median (Census county adjacency) instead of its state's. The other housing rows stay open with their reasons.

**Rules.** Estimate, never UNKNOWN: a missing county value starts from a sourced neighbor average, never zero. One rule, all 56 places: the neighbor list is data, with no county named in code.

**Done when.** The ten counties with a withheld median read their neighbors' range in src/core2/housing-county-neighbors.test.ts, and SG-WORLD-housing-county-estimate is resolved in stopgaps.json. Remaining rows (landlord, eviction steps, shelter beds, foreclosure steps) are each a research or engine item of their own.

**Files.** src/core2/modules/housing.ts, src/core2/data/housing/county-neighbors.json, src/core2/data/stopgaps.json

**Notes.** Partial: one of the housing stopgap rows closed.
