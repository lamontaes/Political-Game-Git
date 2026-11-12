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
after: gov-other-local-bodies-are-seated-in-the-players-state
blocked-on:
lead: nation
model: opus
effort: high
root: rc1-world-outside-town
source: split from gov-other-towns-and-counties-never-meet in the pool redo, Nov 10, 2026
checked: fable 2026-11-11
claimed-at:
branch: claude/pool-gov-other-towns-and-counties-never-meet-part-1-bodies-sit-as-results
---

**What.** Outside the player's own town, no local government does anything: in a played year in Caño Martín Peña, Puerto Rico (seed 50fe2d1143af) all 25 local sittings were the player's own board. This part makes the other towns of the player's county and the other counties of the player's state decide through the one body engine at a coarse level, once a year, from their members' own views. Only the result is kept: the law in force, its date and the vote count. Seen: dev mode's Watch lists what other towns and counties near the player passed this year. Feeds: gov-other-towns-and-counties-never-meet-part-3-readers-and-speed

**Cause.** Found in code: the coarse path exists for other states only, and nothing gives it a local body. In src/core2/modules/world-legislating.ts, `openOutsideSession` (the function under stopgap SG-GOV-outside-session-result-only) counts each seated member's `officialStance` on each question and books one `outside-enact` entry per change that carries, and `outsideEnact` writes one law row with the counts through `enactLaw`. Both are fixed to a state: they read `chamber(api, jurisdiction, "legislature-lower" | "legislature-upper" | "legislature-unicameral")`, the level "state", `stateActEffectiveDate` and the state session calendar. The path the player's own council takes cannot serve another town: `localMeeting` in the same file reads the player's town at each step (`townLean` and `townConcernShare` in `filerOf` and `fileChanges`, `inForceForTown` and `lawChain` in `needsChange`'s caller, the player's county in `scheduleMeeting`). Three things are missing. First, the bodies themselves, which gov-other-local-bodies-are-seated-in-the-players-state seats. Second, a starting answer for a town or county that has passed nothing: `answerIn` reads the jurisdiction's law rows and then the state answers table, so it returns null for a local jurisdiction, though `startingLawRows(lawChainForPlace(placeKey))` in src/core2/laws-starting.ts already gives any place's starting law. Third, a date: `bodyPopulation` in src/core2/office-day-calendar.ts reads the played town's population for every council, so `nextMeeting` would give another town the played town's meeting days. Whose views a sitting there reads is settled by the state path: each member's own `officialStance`, drawn from their party, their seat's lean and their temperament; no residents are needed.

**Fix.** One result path, with the level as data.

1. In src/core2/modules/world-legislating.ts, turn `openOutsideSession` and `outsideEnact` into one pair that takes a sitting row: the jurisdiction, the level (`state`, `county` or `city`), the body office ids, the executive's office id or none, the window's first and last day, and the effective-date rule. The state rows are built as today from the session calendar, and their results must not change (`src/core2/state-sessions.test.ts` passes unchanged).
2. A local row is built for every office the offices table holds with `coversTown: false` and kind `council`, `county-board` or `township-board`. Its window is the calendar year. Book one calendar entry a year for each body (kind `outside-local-year`, key `outside-local-year:<office id>:<year>`), the first on the day after the world opens and each later one on January 2. No entry runs daily and nothing loops over the bodies outside those entries.
3. A change carries when more seated members are for it than against it (`officialStance` times the direction, as the state path counts). Another town's mayor is not seated, so there is no veto: add that sentence to the record of SG-GOV-outside-session-result-only in src/core2/data/stopgaps/gov.json. Only questions the level may decide are counted: `levelMayDecide(api, level, question, direction, stateKey)` with the player's state, which is the body's own state.
4. The answer in force: `answerIn` for a jurisdiction that is not a state reads its enacted rows, then that place's starting law where it has any (`startingLawRows(lawChainForPlace(placeKey))`, by the office row's `placeKey`, which the seating item stores), and otherwise answers that no local law stands, which is how the played town's own council is read in a place with no starting rows (`ownRow`). Read the starting rows once per body-year, not per question.
5. Each result is dated on one of the body's own meeting days: spread the results through the year as `openOutsideSession` spreads them through a session, then move each to the body's next meeting day with `nextMeeting`. For that, `bodyPopulation` in src/core2/office-day-calendar.ts reads the body's own place (`placePopulation` in src/core2/gov-rules/place-population.ts, by the office row's `placeKey`) when the office does not cover the town.
6. On its day the result is one law row through `enactLaw`: the body's jurisdiction, its level, the question as the series, the value, an effective date by the rule the player's council's ordinances use (the `ordinanceEffectiveDays` parameter, read where src/core2/modules/legislature.ts builds a bill's effective date; move that into a small shared function instead of copying it), `measureId` of the year and the result's number, and `terms` holding the count (`chambers: "yes-no"`), the body's office id, the direction and the margin. If the law changed in between, nothing passes, as in `outsideEnact`. No `sessions` row, no bill, no vote row and no event of the body's own is written, so nothing new grows with history but the law rows, which are records with effects. Budgets are left out of this part.
7. Dev mode's Watch gets a section listing this year's law rows whose jurisdiction is another local government in the state: the place's name, the question's worded title, the date in words and the count. Add it to `watchView` in src/bench/dev-mode.ts and draw it with the table style in src/bench/ui/dev-watch.mjs; the heading comes from src/bench/data/controls.json.
8. Add the yearly entry to docs/design/daily-register.md only if the guard asks for it (`npm run guards -- daily-register`); it is yearly, on a dated entry.
9. Measure `npm run speed:year` on the same machine before and after, in one drawn place, and put both four-year tables in the pull request. If any year is more than 20 percent slower, cut the count of questions read per body to the ones its level may decide before counting anyone, and say what the cut saved.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: which other local bodies exist and when they sit comes from each place's data rows, read by the one body engine, with no second engine and no named place. No dice: what another town's board passes follows its members' views and the place's conditions, never a rate, a cap or a chance. An effect is a read, not a record: another town's result counts only when a different engine reads it, named by record id. The speed rule applies: results only, on the days a body sits, and nothing scans every town every day (owner, Nov 5: "generate on demand").

**Done when.** A second session, in the running game with the Place field empty (a drawn place, written down with its seed), plays one year with dev mode's Run on the Calendar and finds dev mode's Watch panel listing results from at least three other towns or counties in the player's state, each with a law or budget they changed in the year, its date and its vote count, by record id. In Caño Martín Peña, Puerto Rico, seed 50fe2d1143af, one year, local results are no longer the player's own board alone, where all 25 sittings were.

**Waits on.** gov-other-local-bodies-are-seated-in-the-players-state.

**Files.** src/core2/modules/world-legislating.ts, src/core2/office-day-calendar.ts, src/core2/laws-starting.ts, src/core2/gov-rules/place-population.ts, src/core2/modules/legislature.ts, src/core2/data/stopgaps/gov.json, src/bench/dev-mode.ts, src/bench/ui/dev-watch.mjs, src/bench/data/controls.json, docs/design/daily-register.md

**Notes.** Released (2026-11-10): Cause differs from code: seatOutsideOffices seats only other states' chambers and executives, and local offices exist only for the player's place (offices.ts:712), so no other town or county body exists to schedule. Continue on branch claude/pool-gov-other-towns-and-counties-never-meet-part-1-bodies-sit-as-results.

Claimed by next for opus-5234 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-10 23:43 UTC) on branch claude/pool-gov-other-towns-and-counties-never-meet-part-1-bodies-sit-as-results.

Released (2026-11-10): Re-offered after opus-d23b released it (PR 8269); confirmed no other town or county body is seated (offices.ts:712), marking its Cause Needs cause. Continue on branch claude/pool-gov-other-towns-and-counties-never-meet-part-1-bodies-sit-as-results.

Cause found (Fable B, 2026-11-11): read on main at c131ae5198. The state path (`openOutsideSession`, `outsideEnact`, `rollCallOf`) already does for other states what this part asks for other towns, so the fix is that path with the level as data, not a second engine. Seating is split out as gov-other-local-bodies-are-seated-in-the-players-state, because `isOutsideOffice` in src/core2/modules/offices.ts answers "not outside" for any jurisdiction that does not start `US-`, and ten readers ask it. Which bodies: the other towns of the player's county and the other counties of the player's state, both read from the place map (`placesUnder`); that is the smallest set that gives the player news from nearby and from across the state, and it is all one state, so `levelMayDecide` needs no second state's powers. Not measured: the cost. By count it is small beside the state sessions (a board of five on about forty questions, once a year), but the builder measures it. Counted: src/core2/data/laws/starting-law.json holds starting rows for 135 places and 125 counties, so most other towns and counties start with no local law of their own, and `needsChange` then lets a wanted policy pass where it is not law. Unknown: how many changes a board passes in its first year under that rule; if it is every question its members favor, the builder says so in Notes and a research item gives those places a starting law.
