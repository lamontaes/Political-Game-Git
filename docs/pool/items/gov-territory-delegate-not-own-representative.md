---
id: gov-territory-delegate-not-own-representative
title: "A territory's or D.C.'s delegate is never the player's own member of the House"
area: gov
kind: bug
priority: 2
size: S
status: claimed
claimed-by: claude/territory-delegate-own-rep
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-26T23:08:08.218Z
---

**What.** In Agana Heights, Guam (place key territory:GU:agana-heights, place seed c82744946a73a5c84055d71630f86ed0750ee82b980b984434a835fa6a8ce3c6), the offices engine loads Guam's Delegate (kind us-house-delegate) with no seat covering the town, so townSeats has no member of the House over the player. The opening's key people (src/core2/data/opening/key-people.json, ownOffices) also list only us-house as own-us-representative, so even a seated delegate would not count. Politics therefore shows a Guam player no member of the House of their own, while every state's player sees one U.S. representative.

**Rules.** One rule, all 56 places: the delegate or resident commissioner of D.C., Puerto Rico, Guam, the U.S. Virgin Islands, American Samoa and the Northern Mariana Islands is the player's own member of the House exactly as a state's representative is, from the offices data. Estimate, never UNKNOWN.

**Done when.** In buildBenchWorld in a place drawn from D.C. and the five territories (bounded draws that fail when they run out), townSeats has the delegate's seat over the town, keyPeopleOf names its holder with reason own-us-representative, and src/bench/government-own-members.test.ts asserts one member of the House for every drawn place, named by record id.

**Files.** src/core2/offices-state.ts, src/core2/data/opening/key-people.json, src/core2/opening-key-people.ts

**Notes.** Found by play-stop-05-politics-lists-wrong-officials-a (PR #6127). lead: laws.
