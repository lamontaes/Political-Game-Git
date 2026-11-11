---
id: world-housing-shelter-beds-by-place
title: "A place's shelter beds come from the HIC projects in or near it, not its state's rate times its people"
area: world
kind: feature
priority: 2
size: M
status: dropped
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: m0-m2
model: sonnet
effort: medium
root: rc9-place-facts-one-default
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** `shelterBeds` in src/core2/housing-homeless.ts gives every place its state's year-round beds per 10,000 (HUD 2025 HIC) times its people, so a small town has a fraction of a shelter and a big city has too few. The eviction path reads that count when it decides whether a removed household is sheltered or on the street. The 2025 HIC project rows are now summed by state and city, with HUD geocodes and count-night occupancy, in data/research/world/hud-hic-2025-beds-by-city.json. Read them: a place's beds are the beds HUD lists in its city, else the beds of its county's geocode or its Continuum of Care shared by population, so the beds a household can reach are the ones that exist near it. This clears SG-WORLD-housing-shelter-beds-state-rate.

**Cause.** Found in code: `shelterBeds` in src/core2/housing-homeless.ts (line 226) multiplies the state's beds per 10,000 by the place's people and marks SG-WORLD-housing-shelter-beds-state-rate (src/core2/data/stopgaps/world.json, open), although data/research/world/hud-hic-2025-beds-by-city.json now holds the HIC rows by city and geocode.

**Fix.** Read the city rows in `shelterBeds` (else the county or Continuum of Care rows shared by population), keep the island-area estimate for American Samoa and the Northern Marianas, and make an evicted household's sheltered or unsheltered status row cite the bed count it read. Resolve the stopgap row.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: the city and geocode join is one rule in data for every place, never a state or city named in logic, and American Samoa and the Northern Marianas keep their island-area estimate. An effect is a read, not a record: the sheltered or unsheltered status row of an evicted household must cite the bed count it read. Estimate, never UNKNOWN: a place with no HIC row starts from the state's rate and says so.

**Done when.** A second session, on main in a drawn place from all 56 that the builder did not choose, runs a year in dev mode, finds a household that was evicted, and reads its sheltered or unsheltered status row: the row names the bed count it read, and that count matches the place's HIC city or county rows in data/research/world/hud-hic-2025-beds-by-city.json. A test in src/core2 checks a drawn place's beds against the research file, and SG-WORLD-housing-shelter-beds-state-rate is resolved.

**Waits on.** Nothing.

**Files.** src/core2/housing-homeless.ts, src/core2/data/housing/shelter-beds.json, data/research/world/hud-hic-2025-beds-by-city.json, src/core2/data/stopgaps/world.json

**Notes.** TODO

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have counted shelter beds by city from HUD; the player reads a homeless count, not a bed census.
