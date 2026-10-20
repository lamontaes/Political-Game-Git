---
id: world-dwelling-locations
title: "Dwellings carry a location inside the town so wards and precincts can be drawn from them"
area: world
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
after:
claimed-at: 
---

**What.** Give every dwelling a place inside its town, so a ward or a precinct can be drawn from where people live. Dwellings are rows `dwelling:<householdId>` in the housing module's store (`src/core2/modules/housing.ts`), with a tenure, a kind (house, apartment, farm) and a rent or value but no position. Add a `location` to each: a point in the town's plane sized by the place's land area (the Census Gazetteer corpus `localities.json` is built from carries land area, which the place data does not load yet), laid out from a town center by seeded generation of where things are, apartments and rentals nearer the center, owned houses outward, farms outermost, never two households on a spot. New and rehoused dwellings take a location at the moment they are made, and the rehousing choice prefers a vacancy near the household's old home and work.

**Rules.** No dice: the layout is seeded generation of where things are, keyed to the household id and consistent with the dwelling's kind and the town's density; after day one a new location comes only from a build or a move. One rule, all 56 places: land area and density come from place data with a fallback, and nothing names a place. Estimate, never UNKNOWN: a place with no gazetteer land area uses the county's, marked ESTIMATED with its source. An effect is a read, not a record: the rehousing choice in housing.ts reads the distance, and the ward map (gov-ward-map-from-dwellings) reads the points. One model, two tiers: a counted household's dwelling gets a location by the same layout, and a person filled in lives where their household's record says. This is a game, not a spreadsheet: no address is shown to the player until a scene needs one.

**Done when.** In a one-year run of the played world (buildBenchWorld, a place drawn from all 56 with a seed the builder did not choose, both named in the PR body) every dwelling record has a location inside the town's extent, rentals and apartments sit nearer the center than owned houses on average, and a household rehoused in the year takes a vacancy closer to its old home than the town average, shown by the housing engine's rehousing record id. A test in src/core2/housing-locations.test.ts proves it for the drawn place.

**Files.** src/core2/modules/housing.ts, src/core2/place-lookup.ts, src/core2/tooling/build-places.ts, src/core2/data/places/localities.json, src/core2/housing-locations.test.ts

**Notes.**

Oct 20 (pool feeder): spec written; it was sized L with an empty body; the work is one engine (housing) plus one place-data column, so it fits M. The first consumer is gov-ward-map-from-dwellings, which is blocked on this. Gazetteer land area (ALAND_SQMI) is in the same census-gazetteer-2025 corpus as the existing localities file.
