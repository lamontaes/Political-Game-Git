---
id: housing-dwelling-records-cover-few-households
title: "Few households have a dwelling record on day one in some towns: Norcross, Minnesota opens 17 records for 1,722 households, so nearly every home reads as middle"
area: world
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** room-condition.test.ts on GOLDEN_PATH_SEED=b2 (Norcross, Minnesota, 2746492, place seed 5fe571d94d73c89c29836c319b1fea9fe91a0f0643a3405b54b6340d475128f8) finds 17 dwelling rows (house:own 13, mobile-home:own 1, farmhouse:own 1, mobile-home:rent 1, rowhouse:rent 1) after the first day for 1,722 households, so thirdOf in src/bench/scene.ts reads the other households as middle (lived-in) and the test's 'a town has homes of every condition' (as painted) fails. Housing onDay seeds dwellings from placeMetadata DWELLINGS_KEY only. Seed a1 passes, so coverage varies by town.

**Rules.** Wire to the world: every household has one dwelling record the housing engine reads, not a default; one rule for all 56 places; two-level population: a counted household is read by the same rule as a full one.

**Done when.** src/bench/room-condition.test.ts passes with GOLDEN_PATH_SEED=b2 (Norcross, Minnesota) and on three fresh drawn places, each named with its place and seed in the PR body, and a one-day buildBenchWorld run shows a dwelling row for every household, by count

**Files.** src/core2/modules/housing.ts,src/bench/scene.ts,src/bench/room-condition.test.ts

**Notes.** lead: fixer. Found by the standing red-main owner Oct 29 18:00 UTC while fixing the stale matching-rooms assertion in room-condition.test.ts (PR fixer/red-main-room-condition). Read: OWNER-DECISIONS (Oct 28 matching rooms), searched docs/pool/items for dwelling, housing: no twin.
