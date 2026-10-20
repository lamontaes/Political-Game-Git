---
id: research-housing-sourced-parameters
title: "Research: sourced parameters for housing prices, eviction, foreclosure, shelters and mortgages"
area: world
kind: research
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "collapsed Oct 19, 2026 from world-stopgap-housing-assumed-data, world-stopgap-housing-estimated-law, world-stopgap-housing-foreclosure-assumed-data, world-stopgap-housing-homeless-assumed-data, world-stopgap-housing-mortgages-assumed-data"
claimed-at: 
---

**What.** Apply the sourced rows in docs/research/pool-feeder-oct20/research-housing-sourced-parameters.md to the parameter table(s) and data files for sourced parameters for housing prices, eviction, foreclosure, shelters and mortgages. Each row already carries a value, a low and high spread, a tag (SOURCED or ESTIMATED) and a citation, so the builder enters them, adds a reader for each research file, and resolves these stopgap rows in src/core2/data/stopgaps.json: SG-WORLD-housing-price-index, SG-WORLD-housing-island-areas, SG-WORLD-housing-eviction-steps, SG-WORLD-housing-foreclosure-steps, SG-WORLD-housing-shelter-beds-state-rate, SG-WORLD-housing-shelter-territory, SG-WORLD-housing-mortgage-history. Rows tagged mechanic name a change the area's builder makes to read the sourced inputs; build the simplest version and register what remains.

Rows:

- `SG-WORLD-housing-price-index` in src/core2/modules/housing.ts: Home prices follow FHFA's state house price index through its latest quarter (2026 Q2); after it, and where FHFA has no rows (Puerto Rico and the island areas), they follow consumer prices (CPI-U, which in the data ends in 2025). Replacement: A house price step in the economy (the region's incomes, rates and vacancy), territorial price data, and seller...
- `SG-WORLD-housing-island-areas` in src/core2/modules/housing.ts: Where no ACS tenure or rent table covers a place (American Samoa, Guam, the Northern Marianas, the Virgin Islands), homes are owned in the nation's share and rents and values start at the nation's household-weighted county medians. Replacement: Census 2020 Island Areas tenure, gross rent and value tables for each island area.
- `SG-WORLD-housing-eviction-steps` in src/core2/modules/housing.ts: Eviction steps not yet read from official text: of 56 places, 30 have the notice period read, 23 whether a tenant can cure, 36 the hearing period and 34 the stay; the other values are recalled from secondary summaries, and missing values take the median of the better-sourced places. Replacement: Each place's steps read from the official statute text...
- `SG-WORLD-housing-foreclosure-steps` in src/core2/housing-foreclosure.ts: A state's foreclosure timeline that was not read from its statute (or that has no published average) is taken from secondary summaries or the national average days to complete. Replacement: Each place's foreclosure steps read from its statute text and court rules, with its own average days to complete.
- `SG-WORLD-housing-shelter-beds-state-rate` in src/core2/housing-homeless.ts: A place's shelter beds are its state's year-round beds per 10,000 people (HUD 2025 Housing Inventory Count) times its own people, not the beds its Continuum of Care actually lists in or near it. Replacement: Beds by place from the HIC provider rows (geocode to county and place), with occupancy on the count night.
- `SG-WORLD-housing-shelter-territory` in src/core2/housing-homeless.ts: American Samoa and the Northern Mariana Islands, which have no HUD Continuum of Care, use the nation's shelter beds per 10,000. Replacement: Each territory government's own shelter count.
- `SG-WORLD-housing-mortgage-history` in src/core2/housing-mortgages.ts: Each owner's purchase year comes from the national move-in distribution by age rank, the purchase price is today's value moved back by the state's FHFA house price index, the loan is a 30-year fixed with the NAR median down payment and no refinancing, and the same county mortgage shares by age apply everywhere. Replacement: FHFA house price inde...

**Rules.** Research before building: the sourced figures calibrate the totals the proof reports and never decide what one person does. Estimate, never UNKNOWN: any value without a measure keeps its ESTIMATED tag, source and spread. One rule, all 56 places: place values live in data keyed by place code, never named in logic, and the proof draws a random place. No dice: no seeded roll or fixed percentage picks an actor's outcome; causes and records do.

**Done when.** Each row is SOURCED or ESTIMATED in its parameter table with a citation and a spread, the stopgap rows above are resolved in src/core2/data/stopgaps.json (or kept with a reason), the research-data reader guard and the tripwire test pass, and a one-year played world (buildBenchWorld, a place drawn from all 56, seed named) reports each band and where the town landed against it.

**Files.** src/core2/housing-foreclosure.ts, src/core2/housing-homeless.ts, src/core2/housing-mortgages.ts, src/core2/modules/housing.ts, src/core2/data/parameters.json, src/core2/data/stopgaps.json, data/research/world/

**Notes.** Folded from: world-stopgap-housing-assumed-data, world-stopgap-housing-estimated-law, world-stopgap-housing-foreclosure-assumed-data, world-stopgap-housing-homeless-assumed-data, world-stopgap-housing-mortgages-assumed-data. Rows that are not numbers (missing mechanics in law reach, for example) stay registered; this item sources what they will read.

Figures found Oct 20 for SG-WORLD-housing-island-areas (claude/political-game-pool-b6g0dl; read through Census Bureau pages by search and fetch, not from the DHC tables on data.census.gov; nothing built, the item is blocked). 2020 Census Island Areas, median home value (Census story "New 2020 Island Areas Censuses Data Show Homeownership and Median Home Values", July 2023): U.S. Virgin Islands $290,600, Guam $277,800, Northern Mariana Islands $184,200, American Samoa $84,400. Owner share of occupied units (Census 2020 DHC and cross-tabulation press releases): Guam 52.0 percent, Northern Mariana Islands 29.0, American Samoa 71.1, U.S. Virgin Islands 47.8. Median gross rent for all units is only partly found: Guam $1,057 (DHC summary file); for units built in 2019 or 2020 only, Northern Mariana Islands $502, American Samoa $658, U.S. Virgin Islands $926 (a different universe, not comparable). A builder needs the all-units gross rent for the other three from data.census.gov (DHC rent tables), a per-island research file under data/research/housing/ with a reader in nationTenure and the rent/value fallback in src/core2/modules/housing.ts, and the Census notes on data quality (pandemic collection effects; high allocation rates in Guam).

Oct 20 (pool feeder): research done in docs/research/pool-feeder-oct20/research-housing-sourced-parameters.md (7 rows: 1 sourced, 5 estimated, 1 mechanic).
