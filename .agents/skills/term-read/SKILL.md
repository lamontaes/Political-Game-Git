---
name: term-read
description: How Our Civic Duty reads an official's or a town's term by policy area from the outcome web (src/core2/term-read.ts), and what is built on it, the kind of an address (src/director/address-kind.ts) and the town's strikes, protests and rallies (src/core2/modules/public-action.ts). Use when adding an area, a kind, a reaction to how a term is going, or a bank piece for an address kind, and when proving any of them in a played year. Not for the economy's own numbers (world-metrics, outcome-web) or for scenes (scene-producers).
---

# Reading a term by area, and what reads it

**Look first:** run the `look-first` search before building, fixing, filing or asking. Owner, Nov 8: "if you're having a good term except for education, then you might get a strike"; "the address... it's always good news. It's never bad news"; the kind of address "needs to work off of effects or in-laws and people around them and their temperament and their personality".

## The read

- `placeTermRead(api, placeId, sinceDate)` and `countryTermRead(api, sinceDate)` return one slide per area (jobs, pay, prices, rent, crime, schools, health, roads, environment), between -1 and 1, each citing the two web rows it compared. The areas and their measures are `src/core2/data/term-read/areas.json`; add a measure there, never in code.
- It reads the outcome web's `months` rows. **The web writes nothing on the opening day**, so an opening address has no area read; the first row is the first of the month after.
- **Warm-up trap.** A world's first year is not a trend: in Algiers, Vermont (seed r7) unemployment ran 0.3 to 5.7 percent and poverty 9.6 to 18.6 percent across twelve months and was still rising in the fourteenth, and the school measures read 0 for a town too small to have a class. The read skips twelve months (`warmupMonths`, stopgap `SG-WORDS-term-read-warmup`) and treats a 0 as "no reading". A new reader of web rows should do the same; when the economy's start is fixed the warm-up goes to zero.

## The kind of an address

- `address-kind.ts` scores six kinds (crisis, combative, hopeful, victory, mourning, policy) as what the world gives the kind to say times one plus the speaker's mean trait pull (`src/director/data/address-kinds.json`). Highest wins, ties by name. No roll. A President in their first year cannot take `victory`.
- A bank piece with `addressKind` belongs to that kind; a kind with pieces of its own for a role says only those and every other kind says the role's general pieces (`variantsFor`). Every piece needs both voices (polished, plain) and, for each, both subjects (`inaugural`, `state-of-the-union`); `english-opening-speech.test.ts` fails on a missing pair. A new area topic needs `<area>-worse` and `<area>-better` pieces with `topic` and `requiresFacts`.
- Bank pieces (`data/english/parts/opening-speech.json`) are written by the Story session only (owner, Nov 10). A builder lists the kinds, subjects and voices that lack pieces on the item's pull request. Story generates them with a throwaway script and runs `npx prettier --write` on the bank after; nobody hand-edits a 200-piece file.

## Proving it

- **Unit fixture for the edge:** write web rows the way the web does: one anchor row (`2025-01`) and three rows after the warm-up (`2026-01` to `2026-03`) with every measure of an area moved by the change (`TERM_MEASURES` lists them). `opening-address-kinds.test.ts` and `public-action.test.ts` are the pattern. A fixture with three rows from the opening month reads nothing.
- **Played year:** a year of one town takes about two and a half minutes, so a ten-year address run is a quarter of an hour. Run it in the background (`nohup ... &`, output to a file) and check the file again every few minutes (Claude's Monitor tool does this); piping into `tail` shows nothing until the end, and a long `sleep` is blocked in some tools.
- **People move.** A participant's `placeId` after six months may be another town's; assert they were adults of the town when they joined, not where they are now.
- **The speech engine's cases are not kept in the durable log.** To see who an action pressed, register a small tap module on `CASE_MADE` (see `public-action.test.ts`).
- The yearly address is recorded by `yearly-address.ts` from the director's `onDay`; the household's `address` scene fires from its `president.address` event like the opening's.

## Traps the first night found (Nov 8)

- **`src/director/director.test.ts` forbids a numeric literal in any non-test director file** ("keeps numbers in data"): use `P.zero`, `P.one`, a date helper (`daysBetweenText`) and a parameter (`api.parameter("daysPerMeanYear")`). It was red on main for an hour because #7380 shipped `0`, `1` and `86_400_000`; run that test file on every PR that touches `src/director`.
- **One heavy job at a time.** A year of one town is 6 GB; two background world runs plus a vitest run were killed for memory and the run's output was lost. Start one, check its output file until it ends, then start the next (`heavy-runs`).
- **A mayor is not in the officials engine** (only the state's and nation's officials have a stand row); a local address says its story and asks nothing. Look for an `OfficialRow` before assuming a speaker has views on record.
- **A scene reuses a purpose by its bank pieces, not its type.** To give a kind of scene its own register, add pieces to the existing purpose that require a fact the scene sets (`protest`, `strike`) and put `excludesFacts` on the old pieces that do not fit; do not fork the purpose until it needs its own replies and endings.
- **A player decision belongs to the player:** an engine that decides by traits for everyone (`considerBribe`) checks `isPlayerSeat` first, records the offer as pending with an event the director stages, and settles on the scene's `scene.reply` ending. That is the pattern for any offer made to the player's seat.
- **The press wire keeps only fresh items**, so a test that wants to know whether a story was told reads the `press.printed` stories in the news table, not the wire table days later.
- **Before opening a PR, run the tests that guard what you changed:** `director.test.ts` for any file under `src/director` (it holds the keeps-numbers-in-data check), and the module's own tests for a core2 change.
- **A pass that runs every month over every place needs a timing before its PR** (Speed measured the public-action pass at +10% in a country's first year; the standing bar is 20% slower than base at most, `AGENTS.md` "Speed", and Nov 8's 5% was the CTO's stricter call for that pass). Time it with `npm run speed:year` on one drawn place, one process, before and after (`speed-work`), and make a new monthly pass act only when a record it reads changed.
