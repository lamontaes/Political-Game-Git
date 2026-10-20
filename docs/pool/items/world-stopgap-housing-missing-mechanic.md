---
id: world-stopgap-housing-missing-mechanic
title: "Stopgaps in housing (missing-mechanic): 1 open"
area: world
kind: stopgap
priority: 3
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/housing.ts, kind missing-mechanic"
after: world-housing-landlord-owners
claimed-at: 
---

**What.** Vacancy moves rents at renewal, and completed new rentals now admit unassigned households (`occupyCompletedRentals` in src/core2/housing-occupancy.ts), but the opening's rental stock has no unit inventory, only the place's counts `rentalUnits` and `vacantRental` in the housing `stock` table, so arrivals into and departures from existing apartments are not assigned to a unit. Record the opening's rental units: a `units` table in the housing module with one row per unit (place, landlord, bedrooms, rent, tenant household or vacant), built at the opening from the leases that exist plus vacant units equal to the place's rental vacancy (ACS rental vacancy rate), with counted renters held as unit blocks by bedroom and rent band with a count. Route every arrival (a household moving in through the moves engine, a counted move) through unit assignment by bedrooms and rent against income, and every departure (move out, eviction, death of the last member) through release, then derive `vacantRental` from the units and delete the plus-one and minus-one edits to the stock row.

**Rules.** One model, two tiers: a counted renter group occupies unit blocks by the same assignment rule times its count, and fill-in keeps the unit. An effect is a read, not a record: renewal rent must read the actual vacant units, and the moves engine must read vacancy. No dice: a household takes the best-fit vacant unit by bedrooms, rent and its income, ties by unit id. One rule, all 56 places: vacancy rate and unit mix come from the place's data, not a named place. Replace, never layer: the stock-count-only vacancy edits are deleted when units replace them. Wire to the world: a move-in moves a household into a unit and rent flows to that unit's landlord by journal record.

**Done when.** In a one-year run of buildBenchWorld in a drawn place from all 56 (place and seed named in the PR body, a seed the builder did not choose), a household that moves in is assigned a vacant unit by unit record id and its rent is paid to that unit's landlord by journal record id, a household that is evicted or leaves releases its unit, the place's vacancy equals the count of vacant units at every month's end, the next renewal's rent change reads that vacancy, and src/core2/housing-units.test.ts proves it; the row SG-WORLD-housing-vacancy is resolved in stopgaps.json.

**Files.** src/core2/modules/housing.ts, src/core2/housing-occupancy.ts, src/core2/modules/moves.ts, src/core2/housing-units.test.ts, src/core2/data/stopgaps.json

**Notes.** First row: Vacancy moves rents at renewal, but no household moves in to fill a vacant home: new apartments stay vacant.

Oct 20 (pool feeder): spec written; the 'new apartments stay vacant' part of the row is already fixed (occupyCompletedRentals admits households); the marker in housing-occupancy.ts remains for the existing stock. The unit's landlord is the owner that world-housing-landlord-owners adds.
