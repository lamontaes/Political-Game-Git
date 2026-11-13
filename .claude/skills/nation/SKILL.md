---
name: nation
description: >
  How to add the rest of the country to Our Civic Duty as results: a module
  that keeps national opinion, other states' disasters, budgets, ballot
  measures, the President's acts or the federal courts as rows and counts,
  with detail built on open. Covers the module pattern, the national place record
  the press reads, the words the press needs, the guards a new
  module trips (zero-dice growth, the stopgap family file, import cycles), and
  how to prove it in a played year. Use for any Nation item or any other
  government's engine; not for the town's own engines (the line that owns
  them) or for timing a year (speed-work).
---

# The rest of the country, as results

**The country tier (`docs/design/country-tier.md`, Fable, Nov 10).** Every state is people and firms kept as counts with a state treasury, stepped monthly by the rules the town already uses, and the nation is the sum of the states; time can skip with results first. A new national or other-government module reads and writes that tier's rows (and the `national:<state>` place record) and does not keep its own national number or a second formula beside it. This skill's pattern (a state table, a monthly run, detail built on open) is how a module sits beside the tier. Take work with `docs/pool/START-A-BUILDER.md`; an item that says `Needs cause.` is not built.

## The pattern

- **A module with a state table and a monthly run.** Register it in `src/bench/world.ts` next to its neighbors. A module needs at least one table ("Module state needs at least one table"). Schedule the next run with `api.moduleCalendar(ID).schedule`; its date must be strictly in the future, and `sourceRecordIds[0]` carries the row id when the work is for one row.
- **Results and counts, detail on open.** Keep a row per event or per year (a disaster, a budget year, a stock by group). Counties, cases, members and roll calls are built by a function that reads the record when someone opens it (`nationalDisasterDetail`, `rollCallOf`); never kept.
- **Read the latest by id.** A race, a day or a screen reads the current row with `table.get(latestId)` kept on the state row. A `rows()` scan inside a per-race or per-person call made a year 2.5 times slower before it was fixed (Nov 8).
- **One store.** Another state's budget is a `BudgetRow` in the budget store, built with `publishedBudgetFor` and moved line by line by that state's own base and the tax rates its law has in force (`stateLawInForce`); never one growth factor on the whole (owner's rule, Nov 8). Another state's law is a law row; its taking effect emits one `law-took-effect` event with `placeId: "national:<state>"`, which the press puts on the wire at level `nation`; handlers of the town's effects skip a `national:` event.

## The words

- An event with `news: true` reaches the press wire and is printed. The printed-words test fails any printed story with no words. Give it a builder in `src/bench/printed-words.ts` that reuses an existing bank piece (the hazard bank tells a disaster under its state), or keep it off the wire in `wireItem` (`press-topics.ts`) with a registered stopgap and list the pieces it needs on the pull request; only the Story session writes lines under `data/english/parts/` (owner, Nov 10). The cabinet kinds and another state's measure result are held this way.
- A bank with no place slot reads as local news; an outside story needs a place.

## The guards a new module trips

- **Zero-dice.** A seeded count or day is a roll and a list-pick; the allowlist may only shrink and its growth test refuses any new entry, GENERATION included. Take the draw out (a recorded history under one seeded starting shift) or ask the guard's owner; never edit the allowlist yourself.
- **Stopgap family file.** An entry `SG-<FAMILY>-...` lives in `src/core2/data/stopgaps/<family>.json` and the file is listed in `src/core2/stopgap-families.ts`. Write the JSON with `ensure_ascii=False` so curly quotes are not rewritten in a shared file.
- **Import cycles.** `office-day-federal` must load before `office-day-federal-president`; import it first in any file that imports both.
- **A driver for a played character.** A module that acts for the President skips a person the player controls: `core.playerId` is not enough, use `isExplicitlyControlledPersonV1(core, id)`.
- **Past elections.** A reader of a monthly record gives past (replayed) elections no value from before the record opened; pass the election date.

- **A country-wide result carried through the effect map.** A link whose cause or outcome is the whole country (warming, a hazard level) is a `links.json` row with `carriedBy` naming the module, read with `carriedLink(key)` (it throws without `carriedBy`); a link that is web-run (the carbon-price and power-plant rows) is read from `WEB_LINKS` instead. A `law:` cause is the law in force against the day the world opened, lagged by the row's `lagMonths`, never the law's own value. Every row needs a source quote and (for `ranges`) a bracketing `range` when it is a running link; a carried one may omit it. Twin worlds: `enactLaw` the same series in both worlds and compare signs, not sizes; a 26-month world is the least that clears a 24-month lag.

- **No steering, roles on every parameter row (owner, Nov 8; `tests/guards/no-steering.test.ts`).** Monthly code never pulls a measure toward a level (`L + k*(x - L)`), never closes a gap by a rate and never clamps an outcome: approval moves by this month's change in unemployment and inflation plus its pushes, and nothing else. A level such as 50 percent may be read (the race reads the gap from it) but not pulled to. Every numeric row tagged SOURCED, ESTIMATED or TUNABLE carries `"role"`: coefficient, level, opening or law, or the guard counts it.
- **Weather as an exposure, not a draw.** Each state or county and hazard keeps `expected` (the rate summed month by month, from the recorded history moved by the climate) and `fired`; a disaster happens when `floor(expected)` passes `fired`, taking the next recorded disaster's days and figures in turn under a number of its own (`recorded + 1,000,000 x (k + 1)`). No draw, no list pick, nothing for the zero-dice guard. A county's rate is a fraction of a disaster a year, so a proof that needs a particular template starts the cycle position there and says so (a fixture for the damage path only).
- **Cheap twin worlds.** A module that reads only laws and the calendar (the climate) is proved in a 30-person life core with `openLaws` and the module, one world at a time, keeping the row, not the world: 51 s and 2 GB against 26 minutes and 6 GB for three bench worlds. Print the run time and `rss` in the proof line.
- **A territory's town is a county equivalent.** Puerto Rico's municipio is `county:<fips>` on the `county-whole` base row, so a territory needs that row (the generator `scripts/research/export-public-budget-bases.py` writes it); a missing base row is a $0 budget, not an error.
- **A long test prints progress and screens first.** A search over drawn places with one print at the end cannot be told from a hang; screen the draw from the data (county, template, rate) before building a world, and kill and restart a run that shows nothing after twice its expected time.

## Proving it

- **Played world, drawn place.** `drawPlace(seed, label)` and `buildBenchWorld`, advance days, read the rows by id, and print one proof line (place, seed, record ids) with `process.stdout.write`; run with `--disableConsoleIntercept`. The wire drops old items, so check the wire the day the event happens.
- **Speed.** `npm run speed:year -- --seed <s>` on main and on the branch, one process alone, two to four runs each, and report means or medians per year. Runs that overlap your own typecheck or git work are noise; zeroing the new effect and getting main's times separates cost from outcome.
- **Fixes while the machine runs a long job.** Do not switch the main checkout under a running test or timing. Work in a sparse copy that shares git objects and links `node_modules` (`helper-checkout`); never `git worktree add` or copy the repository on the owner's Mac, and a full copy is about 3.3 GB (owner, Oct 29).
