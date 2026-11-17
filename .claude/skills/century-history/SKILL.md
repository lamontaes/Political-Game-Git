---
name: century-history
description: >
  How the century before day one works in Our Civic Duty (owner, Nov 17, 2026:
  history simulated from 1925, a year at a step, during the loading screen;
  day one is whatever it produced): src/core2/electorate-century.ts, how an
  office joins it, how a race is counted on the one path with play, how a
  place's lean carries a result, the "today" setting, the dev-mode rows, and
  the checks and guards a change to it meets. Use when adding an office, a
  body, the economy, laws or parties to the century, when a day-one value is
  still read from a real record, or when a century check goes red. Not for
  a person's own past (pre-start.ts, past-*.ts) or for timing a played year
  (speed-work).
---

# The century before day one

The ruling: CTO line 6935086070 on #9747 (Nov 17, 2026), the owner's answers to the calibration audit. "History is pure simulation from 1925, a year at a step, during the loading screen ... Day one is whatever that history produced ... Real data only sets how strongly things move one another." The 1925 start (CTO 6935396694), time for a change (6935483451), the count (6936407513) and the carry (6936486748) are ruled on the same thread.

## Where it lives

- `src/core2/electorate-century.ts` (elections family). `runCentury(seed, startDate)` steps 1925 to the last November before the world was built and gives each year back; `centuryOf` runs it once per seed and keeps it. It is a pure function of the seed, so every reader gets the same century without a module of its own.
- Its numbers: `src/core2/data/history/century.json`, each tagged and with its `role`.
- Other families read it through `src/core2/modules/elections.ts`'s re-exports, never the file itself (families guard).
- The bench runs it a year at a step in `benchWorldStages` before the offices open, so the loading screen keeps answering. When #9795's `BuildStep` is on main, it becomes its own stage sized by years.
- `setHistoryMode(seed, mode, startDate)`: the world setting `history: "today"` keeps today's real record. The real-record readers survive only behind it, and every century reader returns `undefined` under "today".

## Adding an office or a body

1. **The seat list is institutional data, never who holds it.** Use the roster's or the research's seat keys, classes, cycles and term limits. The party in those files is read only under "today".
2. **Count every race on the one path:** `countSeat`, then `countParties` in `electorate.ts`. Play's `decide` and the electors' states call the same function. Never add a second count or a second race rule.
3. **The candidates:**
   - A holder runs again until their career (`careerOf`, drawn once when they first win, from the tenure data) or the office's term limit ends.
   - Each candidate brings their own campaign means (`campaignMeansOf`, drawn once per person). Two races of one year and place must never meet the same two typical candidates, or they count alike (row 46).
4. **Seat it on day one** through `centurySeatParty` and `centuryCongressSeat` in `offices.ts` `worldParties`, and through `worldRoster` for every engine that reads a roster.
5. **Give the holder the century's career.** `pastTerms` sets prior terms from `termsWon`, and `electionBehind` and `past-elections.ts` read the seat's race (`centurySeatRace`). A past race cites its century record (`centuryRecordId`), and `realistic-not-real` row 44 checks the count against it.
6. **A place with no counted vote is not elected,** as in play (`countedPlace`); register it.
7. **Add a dev-mode row** in `src/bench/dev-views/opening.ts`, plus its `rows` entry and any new draw site in `opening-sources.json`. `dev-opening-draws.test.ts` fails on an unlisted site such as `src/core2/electorate-century.ts#careerOf`.

## The count and the carry

- **A counted record stands for its own stretch of the lean order** (`rightPartOfRecord`). In a two-party race counted from afar it divides where the gap between the candidates turns. `orderPlacement` reads the same rule, so a place with nothing at stake counts exactly its lean (0.35 counts 0.3500). Without this, 100 evenly spaced voters gave identical shares eight years apart.
- **With the continuous count, 40 voters per place match 400** (one seat of 541 differed in one world) at a quarter of the cost (`centuryVoters`).
- **A place's lean carries its result cleared of two things:** what was personal to the candidates (incumbency, experience, spending) and the year's national tide (approval, the midterm, time for a change, the economy). Leaving the tide in made 87% of sitting Presidents lose and 15 of 20 worlds alternate every term.
- **World B owns the one carry rule** (`carryLeans` in `place-leans.ts` when it lands). The century's interim rule, `YearResults.carry`, is replaced by it.
- **Approval in the century stands at even** until the economy runs (`SG-HIST-century-steady-economy`). The approval engine holds a term at its election share, so an Electoral College winner with a minority of the vote weighed on their party for four years.

## Checks

- **Each unit ships a test** that seats the century's holders at two drawn places, and fails with the century switched off (main's behavior). Undo the century lookup once and watch it go red.
- **Relationships across many worlds, never a target for one** (CTO 6936486748). Re-elected sitting Presidents in a plausible band across 20 drawn worlds, few alternating worlds, a spread between worlds, and day one differing between worlds.
- **No two races share a winning share.** Search a century's races for repeats before you push.
- **Cost.** Time a century with `runCentury` and note the longest year. About 1.1 s and 120 ms with the presidency, Congress and the statewide officers. Tell Speed.

## Traps

- **The roster's congress map takes Congress only.** An executive seat that leaked into `centuryCongressRoster` became a House district named "governor" in `realistic-not-real` row 45.
- **A territory has no county places.** Size it by its delegate's race (`statePlaces(usps, seed, 1)`), as play does.
- **A century test that runs 20 centuries passes vitest's 30 s default** once Congress runs. Give it an explicit timeout.
- **Prove a red on main in a sparse copy of main** (`scripts/storage/helper-checkout.sh new <dir> origin/main`), run the one test, then remove the copy.
