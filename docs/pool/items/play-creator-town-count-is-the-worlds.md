---
id: play-creator-town-count-is-the-worlds
title: "The creator's town list shows the count the world will open on, not the Census count"
area: play
kind: feature
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
lead: play-first
milestone: play-first
---

**What.** The creator's town list (src/bench/creator.ts, creatorTowns) shows each town's published Census count before Start. The world then opens on its own count drawn around it (placeReferencePopulation(geoid, seed), within worldPopulationSpreadShare), so the list and the world can differ by a few people. The world's seed is drawn only when the world is built (handler.ts randomUUID). Stopgap SG-WORLD-creator-town-count-published names this replacement.

**Rules.** Replace, never layer: the list reads the world's own count and the published count leaves the creator. One rule, all 56 places: the proof draws its place from all 56 and names the seed. Realistic not real (owner, Oct 27): no published statistic shows as itself in play. The lane owns src/bench (play-first LAW).

**Done when.** In a played world on a drawn place (buildBenchWorld; name the place and the seed), the creator's town list and the opened world show the same population for the chosen town, read from placeReferencePopulation(geoid, seed) with the seed drawn when the creator opens; src/bench/creator-towns-population.test.ts checks equality instead of the spread, and SG-WORLD-creator-town-count-published is resolved.

**Time box.** 2 hours.

**You will see.** The town you pick in the creator shows the same number of residents the game opens with.

**Screenshot.** The creator's town list beside the opened town's population, for one drawn place.

**Files.** src/bench/creator.ts,src/bench/creator-towns-population.test.ts,src/bench/handler.ts,src/core2/data/stopgaps.json

**Notes.** Filed by the wire-office session (Oct 28) from the stopgap the last session registered on #6598; the replacement is in the lane's files. Read: OWNER-DECISIONS (realistic not real), LAW.md; searched docs/pool for creator, town count, population; Drive: not searched.
