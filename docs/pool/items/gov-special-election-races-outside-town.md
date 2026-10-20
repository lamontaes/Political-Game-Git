---
id: gov-special-election-races-outside-town
title: "Special elections for state and federal seats outside the town are real races, not the registered stand-in"
area: gov
kind: feature
priority: 2
size: M
status: done
claimed-by: claude/special-election-races
pr: #5095
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T18:41:15.488Z
---

**What.** Special elections for state and federal seats outside the town are registered with a stand-in instead of running as real races. When one of those seats falls vacant, the contest is recorded but nobody files, campaigns or is chosen from a real field, so the seat is filled by the stand-in. Run these races through the same elections engine as the town's own, with a coarser field for places the player does not live in.

**Rules.** One rule, all 56 places: the same race engine runs every seat in every place, with place facts in data. Replace, never layer: the registered stand-in and its stopgap row are deleted in the same change that makes the real race.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, a vacancy in a seat outside the town is filled by a contest with named candidates and a winner, by contest and person record id, and the stand-in's stopgap row is resolved.

**Files.** src/core2/modules/world-races.ts, src/core2/modules/elections.ts, src/core2/data/stopgaps.json

**Notes.** Written from the title and the evidence on the item when the quality gate was repaired (Oct 16).

Looked at Oct 17 (claude, nothing built). Where the stand-in comes from: `unfilledTerm` in modules/offices.ts opens a special election through `specialElections` (registered by the voting engine), and the voting side's `specialContestFor` in modules/elections.ts returns null for any seat that is not one of `townSeats(api)`, so a vacancy outside the town falls to the calendar stand-in (`SG-GOV-special-election-appointee`: the best-suited person takes the seat on the day). A real race for those seats means running them through the coarse path that `world-races.ts` uses for other states' regular races (`recordPlaces`, `decide`), not the town's filing and campaign path; there is no special-election case in world-races.ts today. Only seats that exist in the offices table can fall vacant, which means Congress (all states) and the player's own state; other states' legislatures do not exist yet (gov-other-state-legislatures). So the first buildable slice is a vacancy in a House or Senate seat outside the town, run by world-races with a special date from `specialElectionDate`.

Second look Oct 17 (claude, nothing built): in world-races.ts every state and federal seat the town sees from afar is elected on the general election day and seated on the real date (`racesIn`, `seat`), as coarse race rows with no term records in the offices table; nothing in the world makes one of those seats fall vacant mid-term (no death, resignation or removal for an outside holder), so the stand-in is never reached for them today. The stand-in is reached only for seats in the offices table, which are the player's own state's and Congress's (members of Congress do die and resign through the health and offices engines). So this item has no trigger for an outside state seat until outside holders exist as people with terms (gov-other-state-legislatures). For a Congress seat outside the town, the first slice is the one in the earlier note.
