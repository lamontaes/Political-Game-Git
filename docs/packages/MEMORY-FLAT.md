# MEMORY-FLAT: a town costs tens of megabytes, not a gigabyte

A two-level played world holds about 1,000 MB of heap today, and about 25 MB of that is the town. The rest is data for the whole country loaded before any town exists, the entire generated opening kept alive for the whole game, and 40,000 per-person voter rows rebuilt every day. This package removes those three and puts a memory ceiling in the gate. It builds no new store, cache, index or format. _The Political Process_ runs a whole country in a few hundred megabytes by keeping statistics per place and compact records per official. We already have the counts and the voter groups; this makes the game use them.

## Who builds it, where

- **Builder:** one Opus session, high effort, owning the whole list.
- **Branch:** `opus/memory-flat`, from `main`.
- **Allowed paths:** `src/core2/modules/residents.ts`, `src/core2/residents.ts`, `src/core2/electorate.ts`, `src/core2/voter-groups.ts`, `src/core2/opening-voter-groups.ts`, `src/core2/modules/voting.ts` (only where it reads counted voters), `src/core2/places.ts`, `src/core2/place-lookup.ts`, `src/simulation/life-places.ts`, `src/simulation/government-units.ts`, `src/simulation/legislature-rule-packs.ts`, `src/simulation/county-citizenship.ts`, the import lines of any `src/core2` file that reaches `src/simulation/legislation-scenarios.ts` or `src/simulation/demo.ts`, `src/core2/modules/news.ts`, `src/core2/modules/outcome-web.ts`, `src/core2/modules/regional.ts`, `src/bench/server.ts` (the full-population build route only), `scripts/core2-guard/memory.mjs`, `scripts/core2-guard/policies.json`, `tests/golden-path/played-world.node-test.ts`, the tests of files touched, `docs/archive/2026-10-23/roadmap/PROGRESS.md`, one release note. The core's state and clock (`src/core2/state.ts`, `life.ts`) are OPUS-CORE's: a need there is a written request in the PR body.
- **Read first:** `AGENTS.md`, this file, the residents runtime (`src/core2/modules/residents.ts`, around the `runtimes` WeakMap), the counted-voter cache (`src/core2/electorate.ts`), `scripts/core2-guard/memory.mjs`, and OPUS-CORE's memory notes in `docs/archive/2026-10-23/coordination/core.md`.

## What was measured (main, October 13, 2026, two-level build, bookkeeping off)

| Part                                 | Heap                              | Where it is held                                                                                                                                                                                                                                                                                                     |
| ------------------------------------ | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Engine imported, no town yet         | 443 MB                            | Module-level data for all 56 states: the place corpus, legislature rule packs, government units, county citizenship, OEWS, districts and schools; the demo module `legislation-scenarios.ts` builds three scenario worlds at import; the TypeScript loader keeps every generated module's source text and source map |
| The generated opening, kept all game | 300 MB                            | `residents.ts` runtime, `input` field: every one of about 40,000 generated people with past facts, trait sources, said lines, looks and provenance prose                                                                                                                                                             |
| Counted-voter rows                   | 136 MB                            | `electorate.ts` cache: one object per counted resident, rebuilt and cached each day                                                                                                                                                                                                                                  |
| The town itself                      | about 25 MB                       | 291 full people, 1,270 husks, households, jobs, money, module tables                                                                                                                                                                                                                                                 |
| Growth                               | 50 MB a month early, 3 to 7 later | news heard (27,603 rows in 3 months), outcome-web landings (13,143), regional months (9,636), the durable log (6,531)                                                                                                                                                                                                |
| The 7 GB crash                       | 2,980 MB after one month          | the bench's "Generate a town" route builds the full population; `/play` does not                                                                                                                                                                                                                                     |

## Build, in this order

1. **The opening is not kept.** The residents runtime keeps the seed, the counts, the household records it already derives, and which households were filled in. It does not keep `input`. Fill-in of a counted household regenerates it from the seed the way the deep past already rebuilds (`pastBuild` in `src/core2/residents.ts`), and the regenerated person must match the records (the two-level rule). The snapshot code already assumes this; its comment says so. Measure: heap after build drops by about 300 MB; a filled-in person is the same person on a second fill-in.
2. **Counted voters vote as groups.** Remove the per-person row cache. Counted turnout and votes come from the voter groups the opening builds (`opening-voter-groups.ts`, `voter-groups.ts`), each group a count with its lean, age band and work pattern, which is what the rows were being summed into anyway. The result rows keep their counted totals by group. Measure: heap drops by about 136 MB; the played-world test's "counted voters vote in local races" stays green.
3. **One state loads, not fifty-six.** The nationwide modules that build their tables at import (`life-places`, `government-units`, `legislature-rule-packs`, `county-citizenship`, `place-lookup`, `places`) build lazily for the state the world draws, on first use, and nothing else. The demo module `legislation-scenarios.ts` and `demo.ts` leave the new core's import graph; the one tooling script that uses it imports it itself. Measure: heap after importing `src/bench/world.ts` falls from 443 MB to under 150 MB; a 56-place sweep still draws every place.
4. **Growth gets a retention rule, where the data is written.** News `heard` drops entries past the story life on a daily pass, not only on read. Outcome-web `landings` keep the current and previous month per person. Regional `months` keep the current year and yearly summaries before it. The durable log keeps the player's rows, public records and news, and compacts the rest monthly, as OPUS-CORE already does for routine metrics. Measure: growth under 5 MB a month over a three-year run of the existing memory script.
5. **The bench builds two-level.** The `/api/build` route passes `twoLevel: true`, same as `/api/newlife`. The full-population build stays available only behind an explicit flag for tests. Measure: a month on "Generate a town" stays under the ceiling.
6. **The ceiling goes in the gate.** `scripts/core2-guard/policies.json` gets `heapAfterImportMiB`, `heapAfterOpeningMiB` and `heapGrowthMiBPerMonth` as TUNABLE rows with the reason, and the played-world test asserts all three. Numbers to start: 150, 250, 5.

## What counts as finished

- The played-world test passes on two fresh seeds the builder did not choose, with heap after import, heap after opening and growth per month in the PR body, under the ceilings.
- A filled-in counted person matches the records and comes back the same on a second fill-in, on both seeds.
- Counted votes in local races still exceed named votes, by group, on both seeds.
- The three-year memory script shows growth under 5 MB a month.
- Year time within 20% of main on the same seed; the opening is not slower than main.
- No new store, cache, index or data format. No state named in logic. Saves still rebuild the world from the recipe.

Not finished means the PR body says which of the six steps landed, with the measured heap for each, and which did not and why.

## Do not

- Add an "archive index" or any new structure. The counts, voter groups, seed and snapshot recipe already exist; make the code use them.
- Keep the generated opening anywhere, under any name.
- Fix growth by deleting the player's own records, public records or anything a save needs.
- Tune to one town.
