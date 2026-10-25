---
id: gov-vehicle-tax-household-vehicles
title: "Households hold vehicles, from Census vehicles-available counts by household size and tenure"
area: gov
kind: wiring
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: split from gov-town-payers-vehicle-tax
---

**What.** Give each household, full and counted, a vehicle count drawn from the Census vehicles-available table by household size and tenure, kept as an estimate with a source and a spread. This is one slice of vehicle-tax work: household vehicle records, the rate input and the treasury payment path have distinct acceptance checks. Build only this slice, on the core's existing modules and data rows, and register any stand-in as a stopgap.

**Rules.** One model, two tiers: a counted household is read by the same rule as a full household, times its count. One rule, all 56 places: no state, city or GEOID named in logic. An effect is a read, not a record: the next slice must read what this one writes at the moment the tax is due.

**Done when.** In a played world in a drawn place, every household record carries a vehicle count whose total across the town is within the table's spread of the Census figure for that place's size, and a clicked counted household's count is the same as its group's. A test in src/core2 draws a random place from all 56 with a named seed and proves it in buildBenchWorld over a one-year run, naming the record ids.

**Files.** src/core2/data/vehicles/, src/core2/population.ts, src/core2/state.ts

**Notes.** Split Oct 19 from gov-town-payers-vehicle-tax; see its notes for the three gaps found.
