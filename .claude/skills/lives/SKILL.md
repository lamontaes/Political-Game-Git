---
name: lives
description: >
  How Our Civic Duty simulates the lives of people outside the played town
  (owner, Nov 1: "EVERY. LIFE. IS. SIMULATED."): the relatives and town leavers
  of the inactive "husk" tier, kept minimal until met, run through the engines
  that already run the town's people at a coarse cadence, and how a unit is
  proved (the real-rate check, the played-world record, the speed bar). Use
  for any core-every-life-* item, for a husk's moves, work, partnership,
  births, illness or death, and when a talk or paper reads a relative's news.
  Not for filling a person in (two-level population, state.ts) or for wording
  the news (words-engine).
---

# Lives

**The ruling (owner, Nov 1, OWNER-DECISIONS 16:50):** "EVERY. LIFE. IS. SIMULATED. WHAT DO YOU NOT UNDERSTAND. THIS IS LOW INTENSITY STUFF." A relative or acquaintance who lives elsewhere works, moves, marries, has children, falls ill, ages and dies, through the same engines as the town's people, at a coarse cadence, and each event leaves the engine's own dated record. Item: `core-every-life-simulated`, lead: lives.

## Who a husk is

- A husk is a full `PersonState` of tier `husk` (cadence `inactive` in `content.json`) in `core.people`: the opening's kin outside the household (`opening-kin.ts`, built only for kept households in the two-level opening), and town leavers after `moves.ts` sets them to the tier. They have no job, no money and a household of their own. `core.husks` is a different thing: named records of the dead and of collapsed people, never simulated.
- The tier also holds people who are not lives elsewhere: the central bank's board (`national:central-bank`), people back in the counts (`isDemoted`, place prefix `counted:`). `livesElsewhere(core, person)` in `src/core2/modules/moves.ts` is the one test: alive, the inactive tier, not demoted, not in the played town (`townPlaceOf` and `focusPlaceIds`), and in a real place or a state's record.
- **Most relatives far away live at the state's own jurisdiction id**, which `corePlaceByJurisdictionId` does not resolve (it knows towns, counties and territories). Read their state with `coreStateKeyOfJurisdictionId` (`place-lookup.ts`). Missing this left every far relative on the national rate and out of the review (Nov 1).
- `focusPlaceIds` is empty in a bench world. Use `townPlaceOf(core)` for "the played town" and cache it per world; it scans the place list.

## How a life runs

- **One engine per event, never a life simulator.** Find the engine that already does it for the town and let husks into it. Health already indexes every living person by onset and death date, husks included. Moves: the monthly review (unit 1, `core-every-life-moves`). Work, partnerships and births: units to come; births follow partnerships through renewal's `family.partnered` reader.
- **Read ties where they live.** An engine written for the town says "in town" for household, partner and kin; for a husk that means alive in the same place (`here()` in moves.ts). The town's own path must stay byte-for-byte the same: ask the speed lead for the records proof.
- **Normalize against their own kind.** Where an engine scales a person against the town's typical (moves' band typical), husks get their own typical, or a husk with no job or home reads as unusually loose and moves far too often.
- **Spread the opening once.** An engine that ranks the town's people at the opening so events run steadily from month one (moves' `openingPulls`) ranks husks the same way, once, with its own state flag (`elsewhereRanked`), or nobody moves for years and then everyone does.
- **Cadence:** on the engine's monthly calendar entry or the event's own date, never a daily scan of every husk. Monthly over the husks is cheap (3 to 28 at the opening in the draws measured, plus town leavers).
- **Two-level population:** a husk's event never fills them in and moves no money. A record names them; Words reads the record.
- **A record nobody in town hears is silent.** Put the relatives in town in `witnessIds`, so `retainLog` keeps it (the player's circle) and the player's knowledge holds it. A husk never moves into the played town (SG-LIVES-elsewhere-not-into-town) until arriving goes through the counted arrival path.
- **Couples:** the opening links a resident's two living parents as partners when their marriage is intact (`opening-kin.ts`, the NSFG draw), so a couple moves together. Siblings and grown children elsewhere have no partners until the partnership engine exists.

## Proving a unit

- **The rate check, not a quota (CTO, Nov 1, under "No dice").** Real rates check totals and never set how many must happen. A test in `generatedOpening` (every household with kin, hundreds of husks, half a year) checks the count against the real rate within three standard deviations, on three draws (`moves-elsewhere.test.ts`).
- **The played record.** In `buildBenchWorld` a player has only 3 to 9 relatives elsewhere, and at real rates about one in five has news in a year (a couple moves less often than a person alone). A one-year run often shows nothing. Run five years (about 80 to 170 s a year), name the place and seed, and give the record id, its witnesses, the player's knowledge key and the journal line that cites it (`composeJournal`).
- A town test that watches `departuresSeen` now also sees husks' moves: scope town checks to the opening's non-husk people.
- **Speed:** send the branch to the speed lead before the PR. They alternate base and branch twice on `npm run speed:year -- --seed long-1 --years 4` and compare records proofs; list every differing table in the PR (`speed-work`).
- `pkill -f <script>` also kills the shell that is waiting on it; match `node.*<script>` instead.
