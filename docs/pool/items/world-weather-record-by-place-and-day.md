---
id: world-weather-record-by-place-and-day
title: "A weather record in the core: rain, snow and clear by place and day, so a scene's backdrop follows the day's weather"
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

**What.** The owner's Oct 27 ruling (OWNER-DECISIONS.md line 19: a scene draws from the whole painting set for its place type, time and weather) has no weather to read: src/core2 keeps no day-by-day weather record, so #6438 picks backdrops by place type, town and time only and defers rain paintings. The people-in-rooms lead's 23:40 UTC block (Oct 27) and the retroactive look-first audit (docs/reports/retroactive-look-first-2026-10-27.md, line 839) both name the gap; no pool item existed. Build one daily weather record per place (clear, rain, snow, storm) from causes: the place's climate normals in a parameter table (SOURCED, NOAA normals by state and territory), the season and the day, never a monthly chance; the existing hazard and disaster records (DECISION-REGISTER line 344) stay separate and may read it.

**Rules.** No dice: the day's weather follows the place's normals and the season through a seeded per-world draw of who-exists style, never a roll deciding a person's choice. One rule, all 56 places: normals live in data for every state and territory. Speed: written once per day per place, read by index, no scans. Wire to the world: the director's backdrop pick reads it in the same PR.

**Done when.** In a one-year run of the played world (buildBenchWorld, every module installed, a place and seed the builder did not choose, named), the weather record exists for every day, its share of rainy days sits within the place's NOAA normal band, and the director's backdrop pick for an outdoor scene on a rainy day names the weather record id it read and shows a rain painting where the family has one; a test covers a territory and a state.

**Files.** src/core2, src/director, art/backdrops

**Notes.** TODO
