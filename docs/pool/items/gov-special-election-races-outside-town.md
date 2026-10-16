---
id: gov-special-election-races-outside-town
title: "Special elections for state and federal seats outside the town are real races, not the registered stand-in"
area: gov
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Special elections for state and federal seats outside the town are registered with a stand-in instead of running as real races. When one of those seats falls vacant, the contest is recorded but nobody files, campaigns or is chosen from a real field, so the seat is filled by the stand-in. Run these races through the same elections engine as the town's own, with a coarser field for places the player does not live in.

**Rules.** One rule, all 56 places: the same race engine runs every seat in every place, with place facts in data. Replace, never layer: the registered stand-in and its stopgap row are deleted in the same change that makes the real race.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, a vacancy in a seat outside the town is filled by a contest with named candidates and a winner, by contest and person record id, and the stand-in's stopgap row is resolved.

**Files.** src/core2/modules/world-races.ts, src/core2/modules/elections.ts, src/core2/data/stopgaps.json

**Notes.** Written from the title and the evidence on the item when the quality gate was repaired (Oct 16).
