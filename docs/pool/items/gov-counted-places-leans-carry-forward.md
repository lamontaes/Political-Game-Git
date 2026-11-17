---
id: gov-counted-places-leans-carry-forward
title: "Elections outside the town restart from the 2024 map every time: each counted place's lean is kept and carried forward by its own last result"
area: elections
kind: bug
priority: 1
size: L
status: open
standard: 2
claimed-by: World B (session_01S4WSHpbFr2ZPeKGmsKQPbC)
pr:
after:
blocked-on:
lead: governing
model: fable
effort: high
root: none
source: CTO calibration audit on the crew's thread #9747, Nov 17, 2026, 01:06Z (item 1), the 02:49Z ruling on clearing the tide, and family 6 of "lift the pins" (03:11Z)
---

**What.** Every election outside the town is counted as if the last one never happened. A county that swings hard in 2026 is counted in 2028 on the same 2024 figure, in every world, so the map of the country can never change through play.
Seen: on election night the returns from other states and the electoral map read the same leans every cycle, whatever the last results were.

**Cause.** Found in code: `makePlace` in src/core2/electorate-places.ts (lines 245 to 275) is the one place a counted place's lean is made, from the 2024 two-party share plus this world's swing, and `statePlaces`, `housePlace` and `legislativePlace` cache its answer by the world's seed for good. Every count outside the town reads those: `worldRacePlaces` and `decide` in src/core2/modules/voting.ts (the lean at about line 7096), `electoralCollege` (about line 6426), `basePlaces` in src/core2/race-places.ts (line 52) and the rest of the state on a ballot measure (src/core2/modules/ballot-measures.ts, line 242). `recordPlaces` keeps each place's votes, but no code writes a result back to a lean and no table holds one. With the national tide and the candidates cleared (CTO, 02:49Z), nothing in the count gave a place outside the town a move of its own either: every place read the same two typical candidates and the same national conditions.

**Fix.** A `leans` table in the voting module with one writer, one reader and an opening-lean setter for the history (src/core2/place-leans.ts). `decide` and `electoralCollege` read each place through `keptPlaces`, lay the place's own conditions to the party that holds the seat by the town's own rule (`ownConditionsOf`: the state's unemployment over the last year against the nation's, from the country tier's kept months), and carry into the lean the part of the result that was the place's own (`ownMoves` counts the place twice with no candidate standing, with and without those conditions). `basePlaces` and the ballot measure read the kept leans too. The player sees it on election night and in dev mode's trace: a county's lean is where its own last result left it.

**Time box.** 6 hours for one top-model session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: every counted place reads and writes its lean the same way. One model, two tiers: a counted place's conditions use the town's own rule and strength. No dice: a lean moves only by a recorded result's own part.

**Done when.** A second session starts the bench in a drawn place, for example the place `LEANS_PLAYED_SEED` draws for src/core2/place-leans-played.test.ts, plays past the first general election, and sees in dev mode that counties outside the town hold leans their own results moved and that the next count reads them. `npx vitest run src/core2/place-leans.test.ts src/core2/place-leans-played.test.ts` passes there and the played test fails on main c5808caa.

**Waits on.** Nothing.

**Files.** src/core2/place-leans.ts, src/core2/voting-module-id.ts, src/core2/electorate.ts, src/core2/modules/voting.ts, src/core2/race-places.ts, src/core2/modules/ballot-measures.ts, src/core2/data/electorate/parameters.json, src/core2/data/stopgaps/gov.json, docs/design/daily-register.md

**Notes.** Left for the family's next pull request: the outside counties of the town's own statewide races are read through the kept leans but their counts do not yet carry (they are counted as town contests through another path); and the family's other rows (electorate sizes from 2024 votes, the 2020 apportionment, turnout habit and registration read from the 2024 survey, the petition bases). `leanCarryShare` is TUNABLE at 0.5 until a research item sources it from county returns.
