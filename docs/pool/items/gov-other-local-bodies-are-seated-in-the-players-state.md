---
id: gov-other-local-bodies-are-seated-in-the-players-state
title: "The other towns of the player's county and the other counties of the state have a council or board with members"
area: gov
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: nation
model: opus
effort: high
root: rc1-world-outside-town
source: split from gov-other-towns-and-counties-never-meet-part-1-bodies-sit-as-results by Fable B, Nov 11, 2026
checked: fable 2026-11-11
---

**What.** Only the player's own town and county have a council or a board. The other towns in the player's county and the other counties in the player's state have no office at all, so nothing can sit there and no news can come from them. This item seats them: each one's lawmaking body as an office with seats, and a holder on every seat as a term row, with no full people. Seen: nothing by itself; the next item makes them decide. Feeds: gov-other-towns-and-counties-never-meet-part-1-bodies-sit-as-results

**Cause.** Found in code: src/core2/modules/offices.ts makes local offices only from `localOfficesForPlace(placeKey!)` for the played place, and its `seatOutsideOffices` is called only for other states' chambers, governors and statewide executives and for Congress. `localOfficesForPlace` in src/core2/offices-local.ts would serve: it takes any place key and reads only data. But it stamps `coversTown: true` on every row, and `isOutsideOffice` in src/core2/modules/offices.ts answers "not outside" for any jurisdiction that does not start `US-`. So a second town's council, once seated, would be read as the player's own by everything that asks that question: `src/core2/candidate-pool.ts`, `src/core2/law-reach/group-a-records.ts`, `src/core2/modules/officials.ts`, `src/core2/modules/voting.ts`, `src/core2/office-day-state.ts`, `src/core2/press-topics.ts` and offices.ts itself. And `seatLean` in src/core2/modules/officials.ts gives every local seat the state's 2024 presidential vote, so every board in a state would lean the same way, though src/core2/data/county-presidential-2024.json holds each county's vote.

**Fix.**

1. Add `otherLocalPlaces(placeKey)` to src/core2/offices-local.ts. From src/core2/place-map.ts it returns the other towns under the played place's county (`placesUnder(placeCounty(placeKey).id)`, without the played place) and the other counties under its state (`placesUnder` of the state's row, without the played place's county). Where the map holds none (the District of Columbia and the territories with no other local government), it returns an empty list; that comes from the map, with no place named in code.
2. In the opening in src/core2/modules/offices.ts, after the played place's offices, call `localOfficesForPlace(key)` for each of those places. Keep the rows of kind `council`, `county-board` and `township-board` whose id is not already in the offices table (the played place's own county board is). Put each with `coversTown: false` and a new `placeKey` field, and seat it through `seatOutsideOffices`: a term row per seat with no person. Mayors, executives and row offices elsewhere are not seated.
3. `isOutsideOffice` also answers yes for an office of level `city`, `county` or `township` with `coversTown: false`. Then open each of its callers named in the Cause and confirm that "outside" is what each wants for another town's council; fix any that assumed outside means another state. In particular the Government, Elections and Play as screens list no office of another town, and the played town's law reach does not count their members.
4. `seatLean` in src/core2/modules/officials.ts reads the seat's own county from src/core2/data/county-presidential-2024.json (keyed by state and county name, as `statePlaces` in src/core2/electorate-places.ts reads it) for a local seat outside the played place, marked as an estimate from the county's 2024 presidential vote. Where the county has no row, the state's vote stands, as today.
5. When a term of one of these seats ends, the seat is raced by the same loop that races other states' seats (`racesIn` in src/core2/modules/voting.ts). If that loop needs a district vote these places do not have, keep the holder past the term's end, register `SG-GOV-other-local-seats-not-raced` in src/core2/data/stopgaps/gov.json with what replaces it, and say so in the pull request.
6. Add `src/core2/other-local-bodies.test.ts`: in a drawn place (redrawing, and naming why, when the place has no other local government), at least three other councils or boards are in the offices table with every seat held; none covers the town; `isOutsideOffice` is true for each; and two boards in counties that voted differently in 2024 have different seat leans.
7. Measure the world's build time and `npm run speed:year` before and after on the same machine in one drawn place, and report the rows added (offices, seats, terms). If a year is more than 20 percent slower, find which daily or weekly loop walks the new term rows and make it skip offices that do not cover the town.

**Time box.** 5 hours for one Opus session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: which other local bodies exist comes from the place map and each place's own government rows, with no named place and no second writer of seats. No dice: who holds a seat is seeded generation of who exists, and nothing here decides what anyone does. Two-level population: a holder is a term row and becomes a full person only when the player meets or opens them. The speed rule applies: seating happens once at the opening, and no loop may walk these rows every day.

**Done when.** A second session runs `src/core2/other-local-bodies.test.ts` on main in a drawn place it writes down with its seed, and sees it name at least three other councils or boards with every seat held. Then, in the running game in that drawn place with dev mode on, it opens Government, Elections and Play as and finds no office of another town or county listed, and reads the pull request's two four-year speed tables with no year more than 20 percent slower.

**Waits on.** Nothing.

**Files.** src/core2/offices-local.ts, src/core2/modules/offices.ts, src/core2/modules/officials.ts, src/core2/modules/voting.ts, src/core2/place-map.ts, src/core2/electorate-places.ts, src/core2/data/county-presidential-2024.json, src/core2/data/stopgaps/gov.json, src/core2/other-local-bodies.test.ts (new)

**Notes.** Written by Fable B (2026-11-11) from a read of main at c131ae5198. Which bodies are seated is a design choice: the other towns of the player's own county and the other counties of the player's state, the smallest set that gives the player news from nearby and from across the state. By count that is at most a few hundred bodies of five to nine seats, held as term rows. The CTO's ruling of Oct 29 covers the form: other towns' members sit as named officials on their term rows, filled in only when the player meets or opens them. Not measured here: the build time and the year's time, which the builder reports.
