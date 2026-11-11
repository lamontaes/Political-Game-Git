---
id: gov-other-towns-and-counties-never-meet-part-1-bodies-sit-as-results
title: "Other towns' and counties' bodies sit and keep only their result"
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
source: split from gov-other-towns-and-counties-never-meet in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
claimed-at:
branch: claude/pool-gov-other-towns-and-counties-never-meet-part-1-bodies-sit-as-results
---

**What.** Outside the player's own town, no local government does anything: in a played year in Caño Martín Peña, Puerto Rico (seed 50fe2d1143af) all 25 local sittings were the player's own board. This part makes other towns' and counties' bodies decide through the one body engine at a coarse level, on the days they sit, from the views of the people there. Only the result is kept: the law or budget in force, its date and the vote count.

**Cause.** Found in code: no writer seats any local body outside the player's own place, so there is nothing for a sitting to vote with. In `src/core2/modules/offices.ts`, the opening seats local offices only from `localOfficesForPlace(placeKey!)` (line 712), the player's own place. The one writer of outside offices, `seatOutsideOffices` (line 792), is called only for the other state-level places' chambers and executives (lines 766 to 778) and for Congress seats. So `townBodies` in `src/core2/modules/world-legislating.ts` (line 250) finds only the player's council, county board and township board. A second gap would follow even with seats: a named official's views start from `seatLean` in `src/core2/modules/officials.ts` (line 299), which has no branch for a local seat outside the town and falls back to the state's 2024 presidential vote (line 348). Every outside county would then vote alike. The game holds no county presidential result to read: `data/research/elections` has none, and no code reads one. The results-only path for another government already exists for other states' legislatures: `openOutsideSession` (world-legislating.ts line 1354; stopgap `SG-GOV-outside-session-result-only`) counts members' `officialStance` per question and schedules one `outside-enact` entry per change. A local body can use that same path.

**Fix.**

1. Seats. Seat the board of every other county in the player's state at the opening, through `seatOutsideOffices` and no new writer. Export from `src/core2/offices-local.ts` a `countyBoardOffices(countyKey)` that returns `boardOffices(unit, "county")` for that county's government unit. Export from `src/core2/place-lookup.ts` a `stateCounties(stateKey)` that lists the county places of one state from `countyRows()`. In the opening in `offices.ts`, after the loop at line 763, call `seatOutsideOffices` with those offices for each county but the town's own (`lawChain(api).countyGeoids`). Towns in other counties are not seated in this part. Register that cut as a stopgap in `src/core2/data/stopgaps/gov.json`.
2. Sittings. Give each seated outside county board a sitting on its meeting days, read from `nextMeeting` with that county's geoid, in place of `lawChain(api).countyGeoids[0]`. A sitting runs the vote loop of `openOutsideSession` at `levelMayDecide(api, "county", question, direction, stateKey)`, with the board's members and its elected executive where it has one. Make that loop one function the state path and the county path both call, so there is one results engine. Keep only the result as `openOutsideSession` does: the law row on an `outside-enact` entry, with the date and the count.
3. Views. Until each county's own lean is in data, a county seat leans as the state (`seatLean`'s fallback). Register that as a stopgap. The research is the new item `gov-outside-county-lean-research`. Once it lands, `seatLean` reads the county's share for a county board seat.
4. Speed. A sitting reads only its own members on its own day, with no daily scan. Report `npm run speed:year` before and after in the PR body; the bar is no more than 20 percent slower.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: which other local bodies exist and when they sit comes from each place's data rows, read by the one body engine, with no second engine and no named place. No dice: what another town's board passes follows its members' views and the place's conditions, never a rate, a cap or a chance. An effect is a read, not a record: another town's result counts only when a different engine reads it, named by record id. The speed rule applies: results only, on the days a body sits, and nothing scans every town every day (owner, Nov 5: "generate on demand").

**Done when.** A second session, in the running game with the Place field empty (a drawn place, written down with its seed), plays one year with dev mode's Run on the Calendar. In the record of `outside-enact` entries it finds results from at least three other counties of the player's state, each with the law it changed, its date and its vote count, by record id. In Caño Martín Peña, Puerto Rico, seed 50fe2d1143af, one year, the local results are no longer the player's own board alone (all 25 sittings were). Where the place's state has fewer than four counties, the session names that and counts what there is.

**Waits on.** Nothing.

**Files.** src/core2/modules/offices.ts, src/core2/offices-local.ts, src/core2/place-lookup.ts, src/core2/modules/world-legislating.ts, src/core2/modules/officials.ts, src/core2/data/stopgaps/gov.json, src/core2/world-legislating-outside-county.test.ts (new)

**Notes.** Released (2026-11-10): Cause differs from code: seatOutsideOffices seats only other states' chambers and executives, and local offices exist only for the player's place (offices.ts:712), so no other town or county body exists to schedule. Continue on branch claude/pool-gov-other-towns-and-counties-never-meet-part-1-bodies-sit-as-results.

Claimed by next for opus-5234 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-10 23:43 UTC) on branch claude/pool-gov-other-towns-and-counties-never-meet-part-1-bodies-sit-as-results.

Released (2026-11-10): Re-offered after opus-d23b released it (PR 8269); confirmed no other town or county body is seated (offices.ts:712), marking its Cause Needs cause. Continue on branch claude/pool-gov-other-towns-and-counties-never-meet-part-1-bodies-sit-as-results.

Nov 11 (cause finder for Fable B): read on main 3039a3fa1d. The missing piece is the writer: no other local body is ever seated, and an outside seat's lean would fall back to the state's vote. Other states' legislatures already decide through a results-only path (`openOutsideSession`), so the fix seats the state's other county boards through the one outside-office writer and votes them through that same path, made one function. Other towns, below county level, are left for later as a stopgap, to keep speed in bounds. The county lean is research: the new item gov-outside-county-lean-research.
