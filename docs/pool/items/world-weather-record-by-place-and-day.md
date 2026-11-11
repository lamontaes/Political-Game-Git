---
id: world-weather-record-by-place-and-day
title: "A weather record in the core: rain, snow and clear by place and day, so a scene's backdrop follows the day's weather"
area: world
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: opus
effort: medium
root: none
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** The owner's Oct 27 ruling (a scene draws from the whole painting set for its place type, time and weather) has no weather to read: src/core2 keeps no day-by-day weather record, so backdrops are picked by place type, town and time only and rain paintings are deferred. Build one daily weather record per place (clear, rain, snow, storm) from causes: the place's climate normals in a parameter table (SOURCED, NOAA normals by state and territory), the season and the day, and the climate module's hazard levels, never a monthly chance. The existing hazard and disaster records stay separate and may read it. The people-in-rooms lead's block of Oct 27 and the retroactive look-first audit (docs/reports/retroactive-look-first-2026-10-27.md) both name the gap.

**Cause.** Design: owner, Nov 8 (docs/coordination/OWNER-DECISIONS.md, "weather is basic climate change through the effect map"; src/core2/modules/climate.ts already keeps each hazard's level) and owner, Oct 27 (a scene draws from the whole painting set by place type, time and weather).

**Fix.** Keep one daily weather record per place derived from the climate module's hazard levels, the place's normals and the season with no roll, and have the director's backdrop pick read it, showing a rain painting where the family has one.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop. Seen: a scene's backdrop follows the day's weather (owner's Oct 27 ruling).

**Rules.** No dice: the day's weather follows the place's normals, the season and the climate's hazard levels, never a roll deciding a person's choice. One rule, all 56 places: normals live in data for every state and territory. Speed: written once per day per place, read by index, no scans. Wire to the world: the director's backdrop pick reads it in the same change. Real normals calibrate the record and never decide it (owner, Nov 8: ranges are not targets).

**Done when.** A second session, on main in a place and seed it chooses (named), plays a year in dev mode and finds a weather record for every day, and for an outdoor scene on a rainy day sees the backdrop pick name the weather record id it read and show a rain painting where the family has one. The place's share of rainy days is printed beside the NOAA normal as a report, and a test covers a territory and a state.

**Waits on.** Nothing.

**Files.** src/core2/modules/climate.ts, src/core2/data/climate/, src/bench/backdrop-places.ts, art/backdrops/manifest.json

**Notes.** TODO
