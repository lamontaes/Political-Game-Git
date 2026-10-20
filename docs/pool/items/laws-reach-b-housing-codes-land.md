---
id: laws-reach-b-housing-codes-land
title: "A gas-hookup ban changes new-construction cost and fuel choice; farmland protection zones parcels the builders read"
area: laws
kind: stopgap
priority: 3
size: M
status: done
claimed-by: claude/housing-codes-land
pr: #5457
blocked-on: the housing engine: land parcels with zoning and a building code that sets new-construction cost and fuel choice; neither exists
source: added with npm run pool -- add
claimed-at: 2026-10-20T03:11:56.662Z
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

Oct 20 (claude/housing-codes-land): most of this is built. `modules/housing.ts` reads the gas-hookup ban and farmland laws every month into the town's zoning (`allElectric`, `farmlandProtected`), and `housing-construction.ts` prices them into starts (all-electric cost change on single and multifamily; farmland development share), proven for a drawn place by `housing-laws.test.ts`. What is left is parcels and household fuel choice and energy bills; the two stopgap rows now say so.
