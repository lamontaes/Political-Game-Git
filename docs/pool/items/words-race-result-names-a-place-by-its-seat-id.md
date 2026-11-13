---
id: words-race-result-names-a-place-by-its-seat-id
title: "A State Representative result is told as 'seat:US-VT:lower:L-2:0 gave Carlos Gibson the most'"
area: words
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: Words builder W3
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: low
root: rc2-done-from-records
source: "Playtester P3, Nov 13, 2026 (crew line #8928)"
checked:
claimed-at:
---

**What.** On Nov 5, 2026, the losing candidate Pamela Barrett tells the player the State Representative result: 'Carlos Gibson took 53 percent, and seat:US-VT:lower:L-2:0 gave Carlos Gibson the most.' A record id is said aloud as if it were a place. Seen: the race-told talk on the street, two days after the general election.

**Cause.** Found in code: legislativePlace in src/core2/electorate-places.ts (line 473) passes the seat key itself (`seatKey`) to makePlace as the place's name. The voting engine keeps that name on the race's place rows (recordPlaces in src/core2/modules/voting.ts, line 4125). raceTurnoutFacts in src/director/race-turnout-facts.ts (line 57) then puts the name of the place that gave the winner the biggest share into `best-place`. The scene-talk piece '{winner} took {vote_share} percent, and {best_place} gave {winner} the most.' (data/english/parts/scene-talk.json, line 189210) says it. Measured: North Hyde Park, Vermont, seed a6b481a5-c6c9-432b-8cca-c0463c518da8, main 9ebc7c89 (Playtester P3, Nov 13, 2026).

**Fix.** Give a legislative district's place a name a person would say, taken from data the way county and House places are named (for example the district's own name in the state's district file). Have raceTurnoutFacts leave `best-place` out when a place has no worded name, so the line falls to its version without a place. Add a guard test over every race family's place names in a drawn state, so that no place name contains ':' or matches an id pattern.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** Player screen text: no raw ids in anything said or shown. One rule, all 56 places: the district's name comes from data. No hand-written player text.

**Done when.** A second session plays a drawn place in a state that elects its house by district, named with its seed, through a general election on main. The race-told line names a real place or none, and the new guard test fails on main's seat-key names.

**Waits on.** Nothing.

**Files.** src/core2/electorate-places.ts, src/director/race-turnout-facts.ts

**Notes.**

- Nov 13, Words builder W3: built the second half of the Fix. `raceTurnoutFacts` leaves `best-place` out when the race was counted over one place, and when the place's name is a record key (`placeIsSaid`, tested on "seat:US-VT:lower:L-2:0", "VT-02" and "VT-AL"). The line then falls to its version without a place.
- Naming a legislative district from the state's district file is not built here, so `best-place` stays out for those races until it is.
