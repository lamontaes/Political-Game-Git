---
id: laws-reach-b-housing-codes-land
title: "A gas-hookup ban changes new-construction cost and fuel choice; farmland protection zones parcels the builders read"
area: laws
kind: stopgap
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

Looked at Oct 20 (claude, claude/political-game-pool-76ksvw), not built. Most of it is already built: the housing engine reads the all-electric and farmland laws at its monthly construction decision (`build` in `src/core2/modules/housing.ts` sets `allElectric` and `farmlandProtected` on the town's stock; `housing-construction.ts` applies the all-electric cost change to single and multifamily cost, and the farmland share to land for starts), and `src/core2/housing-laws.test.ts` proves the flags follow the law in an ordinary played year. What is missing is the chain after it: a comparison of two worlds of one seed (law enacted at the town's level against not enacted) showing the starts differ in the direction the parameters say, and a household or builder reached and told, with the director's line. Fuel choice (what a household heats with) and land parcels are not modeled at all (SG-GOV-REACH-B-building-cost, SG-GOV-REACH-B-land-use). Note `allElectricCostChange` is negative (-0.018), so the ban makes building cheaper in the data; check that against its source before the proof calls it a cost.
