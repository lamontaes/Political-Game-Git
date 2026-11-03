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

- **One engine per event, never a life simulator.** Find the engine that already does it for the town and let husks into it. Health already indexes every living person by onset and death date, husks included. Moves: the moves engine's monthly review (unit 1, `core-every-life-moves`). Work: the jobs engine's monthly review runs the pre-start working life's shared pulls (unit 3, `core-every-life-work`, `src/core2/jobs-elsewhere.ts`). Partnerships: a monthly partnerships review on the opening chain's shared paces, through `setPartnersV1` (unit 4, `core-every-life-partners`). Births follow partnerships through renewal's `family.partnered` reader.
- **Read ties where they live.** An engine written for the town says "in town" for household, partner and kin; for a husk that means alive in the same place (`here()` in moves.ts). The town's own path must stay byte-for-byte the same: ask the speed lead for the records proof.
- **Normalize against their own kind.** Where an engine scales a person against the town's typical (moves' band typical), husks get their own typical, or a husk with no job or home reads as unusually loose and moves far too often.
- **Spread the opening once.** An engine that ranks the town's people at the opening so events run steadily from month one (moves' `openingPulls`) ranks husks the same way, once, with its own state flag (`elsewhereRanked`), or nobody moves for years and then everyone does.
- **Cadence:** on the engine's monthly calendar entry or the event's own date, never a daily scan of every husk. Monthly over the husks is cheap (3 to 28 at the opening in the draws measured, plus town leavers).
- **Two-level population:** a husk's event never fills them in and moves no money. A record names them; Words reads the record.
- **A record nobody in town hears is silent.** Put the relatives in town in `witnessIds`, so `retainLog` keeps it (the player's circle) and the player's knowledge holds it. A husk never moves into the played town (SG-LIVES-elsewhere-not-into-town) until arriving goes through the counted arrival path.
- **Couples:** the opening links a resident's two living parents as partners when their marriage is intact (`opening-kin.ts`, the NSFG draw), so a couple moves together. Everyone else elsewhere partners and parts in play (`src/core2/modules/partnerships.ts`).
- **Traits decide who, the rate decides how many (CTO, Nov 1, unit 4).** A trait lean's factor `exp(weight × lean)` does not average one: the lean toward partnering averages −0.246 across people living elsewhere, so every draw ran 9 to 19% under the chain. Weigh each person's factor against the month's typical among those reviewed toward the same change (as moves weighs ties against its band typical); then three draws give 70/69.2, 131/123.8 and 90/86.2. Check every new pull this way: three draws all on one side of the rate is a bias, not noise.
- **One writer per record.** Partnerships go through `setPartnersV1` (now with `witnessIds` and `facts`, e.g. `union: married`); a person who comes to exist in play through `addPersonV1` (no cash, no job, into an existing household at their place). The opening chain's paces are shared functions (`partneringPerYear`, `separatingPerYear`, `partnerAgeFor` in `opening-partnership.ts`), as the working life's pulls are (`past-work.ts`, re-exported from `past.ts`).
- **A generated person is a resident where they live.** Counted-moves counts every living full person in its counted places as a resident ("the full people living in those places are residents too"), so a new partner shifts that place's arrival shares and the town's arrivals. Under one model, two tiers the partner should come out of the place's counts, not on top (`core-every-life-partner-from-counts`).

## Proving a unit

- **The rate check, not a quota (CTO, Nov 1, under "No dice").** Real rates check totals and never set how many must happen. A test in `generatedOpening` (every household with kin, hundreds of husks, half a year) checks the count against the real rate within three standard deviations, on three draws (`moves-elsewhere.test.ts`).
- **The played record.** In `buildBenchWorld` a player has only 3 to 9 relatives elsewhere, and at real rates about one in five has news in a year (a couple moves less often than a person alone). A one-year run often shows nothing. Run five years (about 80 to 170 s a year), name the place and seed, and give the record id, its witnesses, the player's knowledge key and the journal line that cites it (`composeJournal`).
- A town test that watches `departuresSeen` now also sees husks' moves: scope town checks to the opening's non-husk people.
- **Speed:** send the branch to the speed lead before the PR. They alternate base and branch twice on `npm run speed:year -- --seed long-1 --years 4` and compare records proofs; list every differing table in the PR (`speed-work`).
- **When the records proof shows town tables differing, run the ablation before guessing (Nov 1, units 3 and 4).** The same four years twice on one commit, one process at a time: the new review switched off, and the review running with its events silenced (a temporary env switch, kept out of every commit, applied in a helper copy so the main checkout stays clean). If the two proofs differ only in the unit's own table and `core.stopgapHits`, nothing shares state with the town, and every town difference comes from relatives' events reaching their family, which one model, two tiers asks for. When the unit also creates people or links (unit 4), silencing events is not enough: add a mode that makes the people but writes no event, and if the town still diverges, bisect. Build two worlds in one process (`buildBenchWorld` twice, the probe's mode switched by `process.env` before each `advanceCore`), advance both to the day before the first change, then a day at a time comparing `recordProof(core, { rows: true })` with `compareProofs`, leaving out the unit's own tables. The first differing day and table name the reader (unit 4: `part.core2-counted-moves.states` on the day the first partner arrived).
- **A seeded day-one status is a GENERATION roll.** `npm run zero-dice` flags `line < share`. Add the entry to `scripts/zero-dice-allowlist.json` by hand with class GENERATION, keyed by world seed + person id, and the reason (as citizenship's work-authorization roll), inserted in place: `--update` cannot add lines, and re-sorting the file makes a 100-line diff.
- **Typecheck with `npx tsc -p tsconfig.app.json --noEmit`.** `tsc -p .` only references the sub-projects and checks nothing.
- **An engine's own parameters may be missing from the core table** in a test world that doesn't install it (the jobs engine's `jobsEarliestRetirementAge`, the macro engine's `macroHundred`): read them from the engine's parameter file, or use a core one (`percent`).
- **A new pull starts at zero; only day one is spread.** A couple formed in play, or two people who just parted, start their next pull at the beginning, or new marriages split as if years old (unit 4).
- **Someone living elsewhere knows no one full but kin**, so a partner is generated (who exists, seeded by the pair) through `addPersonV1`, at an age the law allows (the writer refuses a partner under 18).
- **Re-point stopgap lines after every edit.** A stopgap's `line` goes stale when prettier or a later edit moves the marker; recompute it from the marker text (`api.stopgap(X_STOPGAP)`) before each commit.
- **Cross a family only through its entry (the families guard, `tests/guards/families.json`).** A file in the jobs family imports place lookups from `places.ts`, the working life from `past.ts`, and `livesElsewhere` or `stateUnemployment` from `modules/people.ts`; add the re-export to the entry when it is missing.
- **A stacked branch merges its parent's merged head.** When the parent PR has just merged main and resolved a conflict, merge that head into the child (`git merge <parent-head>`), so the child resolves the same way, and keep both sides of `stopgaps.json` (check every row still has `status` and `file`, and the ids are unique).
- **Pool items:** `npm run pool -- --check` before every pool push (a What needs at least three sentences and 40 words, a Rules line names a standing rule from AGENTS.md with how it applies). A unit gets its own sub-item, so line 1 of its PR (`Pool item: <id>`) never closes the parent; a skills PR names no pool item on line 1.
- **Send the head you pushed.** Read it with `git rev-parse --short HEAD` after the push and paste that, never one typed from memory (three wrong heads were sent on Nov 1).
- `pkill -f <script>` also kills the shell that is waiting on it; match `node.*<script>` instead.
