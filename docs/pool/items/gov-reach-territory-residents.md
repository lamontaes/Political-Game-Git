---
id: gov-reach-territory-residents
title: "An island area's government carries its Census residents, so group B shares budget lines to the town without a stand-in"
area: laws
kind: stopgap
priority: 2
size: S
status: in-pr
claimed-by: claude/territory-residents
pr: #5167
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T21:48:55.044Z
---

**What.** For an island area the budgets module carried no residents, so group B's law-reach code kept its own table of island populations and shared a budget line's change to the town through it (stopgap SG-GOV-REACH-B-territory-residents). The Census figures were already in public-budget-bases.json (islandAreaPopulation2020 for Guam, the Virgin Islands, American Samoa and the Northern Marianas, puertoRicoPopulation2025 for Puerto Rico). Make the budgets module read them into the state government's residents, delete the second table and the fallback, and mark the stopgap resolved.

**Rules.** Replace, never layer: the group B table and its fallback are deleted in the same change. One rule, all 56 places: the island areas are read by the same rule as a state, from data. Wire to the world: group B's town share reads the government's residents the same day it shares a line.

**Done when.** In the played world (buildBenchWorld) in an island place drawn by a seed nobody chose, the state government's residents equal the Census figure in public-budget-bases.json and group B's town share is between 0 and 1, shown by the test src/core2/territory-residents.test.ts; the group B tests and the stopgap tripwire pass.

**Files.** src/core2/modules/budgets.ts, src/core2/law-reach/group-b-money.ts, src/core2/law-reach/group-b-people.ts, src/core2/data/laws/reach-group-b-parameters.json, src/core2/data/stopgaps.json

**Notes.** Found while taking gov-standins-laws, the umbrella for about forty law-reach stopgaps (each an engine of its own); this is the one that was data only. Puerto Rico's residents change from 3,203,295 (the removed table, Vintage 2024) to 3,184,835 (the bases file, 2025).
