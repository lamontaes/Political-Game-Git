---
id: world-housing-shelter-beds-by-place
title: "A place's shelter beds come from the HIC projects in or near it, not its state's rate times its people"
area: world
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** shelterBeds in src/core2/housing-homeless.ts gives every place its state's year-round beds per 10,000 (HUD 2025 HIC) times its people, so a small town has a fraction of a shelter and a big city has too few, and the eviction path reads that count when it decides whether a removed household is sheltered or on the street. The 2025 HIC project rows are now summed by state and city, with HUD geocodes and count-night occupancy, in data/research/world/hud-hic-2025-beds-by-city.json. Read them: a place's beds are the beds HUD lists in its city, else the beds of its county's geocode or its Continuum of Care shared by population, so the beds a household can reach are the ones that exist near it. This clears SG-WORLD-housing-shelter-beds-state-rate.

**Rules.** One rule, all 56 places: the city and geocode join is one rule in data for every place, never a state or city named in logic, and American Samoa and the Northern Marianas keep their island-area estimate. An effect is a read: the sheltered or unsheltered status row of an evicted household must cite the bed count it read, and estimate, never UNKNOWN, applies where a place has no HIC row.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place from all 56, seed named in the PR body) the shelterBeds count the eviction path reads for the drawn place comes from its HIC city or county rows, an evicted household's status row names that count by record id, and a test in src/core2 checks a drawn place's beds against the research file.

**Files.** src/core2/housing-homeless.ts, src/core2/data/housing/shelter-beds.json, data/research/world/hud-hic-2025-beds-by-city.json, src/core2/data/stopgaps.json

**Notes.** TODO
