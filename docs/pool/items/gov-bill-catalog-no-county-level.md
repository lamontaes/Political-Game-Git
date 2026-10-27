---
id: gov-bill-catalog-no-county-level
title: "The bill catalog lists nothing at county level, and the seat screen gives a county board the city catalog"
area: gov
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/core2/data/legislature/bill-catalog.json lists 59 policy questions, 15 law amounts and 12 budget lines, and not one names the county level (58 questions at city and 58 at state). So billCatalog(api, "county") is empty in every place: in a drawn Black Sands, Hawaii world (key 1502832) the county board's catalog holds no entry while the state's holds 58 allowed questions. The seat screen hides the gap: menusFor in src/bench/legislature.ts maps any body that is not state or federal to the city catalog, so a county board drafts from city entries with city-level authority, an unregistered placeholder. Found while fixing tests-government-scenes-no-allowed-policy, where county boards in Hawaii, Louisiana and Maryland were all set aside.

**Rules.** One rule, all 56 places: a county body's catalog and its authority come from the county column of the powers catalog (src/core2/policy-authority.ts reads a county column already), never from a city's. Placeholders: the city fallback is replaced, not layered. Wire to the world: a county bill drafted from the catalog is enacted and read by an engine in a played world.

**Done when.** In a buildBenchWorld world of a drawn place with a county board, billCatalog for county lists the questions, amounts and budget lines a county may pass with county-level authority, the seat screen reads that catalog for a county board instead of the city one, and a county bill drafted from it passes and is read by another engine, named by record id; src/director/government-scenes.test.ts then sets aside no county board for lack of a catalog.

**Files.** src/core2/data/legislature/bill-catalog.json,src/core2/bill-catalog.ts,src/bench/legislature.ts,src/core2/policy-authority.ts

**Notes.** Measured Oct 26 in Black Sands, Hawaii (key 1502832, world seed 1dbcd755...a2b4): county 0 catalog entries; city 1 allowed, 52 level-lacks-power, 5 state-preempts; state 58 allowed.
