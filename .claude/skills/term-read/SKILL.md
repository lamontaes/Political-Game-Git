---
name: term-read
description: How Our Civic Duty reads an official's or a town's term by policy area from the outcome web (src/core2/term-read.ts), and what is built on it, the kind of an address (src/director/address-kind.ts) and the town's strikes, protests and rallies (src/core2/modules/public-action.ts). Use when adding an area, a kind, a reaction to how a term is going, or a bank piece for an address kind, and when proving any of them in a played year. Not for the economy's own numbers (world-metrics, outcome-web) or for scenes (scene-producers).
---

# Reading a term by area, and what reads it

**Look first (`look-first`).** Owner, Nov 8: "if you're having a good term except for education, then you might get a strike"; "the address... it's always good news. It's never bad news"; the kind of address "needs to work off of effects or in-laws and people around them and their temperament and their personality".

## The read

- `placeTermRead(api, placeId, sinceDate)` and `countryTermRead(api, sinceDate)` return one slide per area (jobs, pay, prices, rent, crime, schools, health, roads, environment), between -1 and 1, each citing the two web rows it compared. The areas and their measures are `src/core2/data/term-read/areas.json`; add a measure there, never in code.
- It reads the outcome web's `months` rows. **The web writes nothing on the opening day**, so an opening address has no area read; the first row is the first of the month after.
- **Warm-up trap.** A world's first year is not a trend: in Algiers, Vermont (seed r7) unemployment ran 0.3 to 5.7 percent and poverty 9.6 to 18.6 percent across twelve months and was still rising in the fourteenth, and the school measures read 0 for a town too small to have a class. The read skips twelve months (`warmupMonths`, stopgap `SG-WORDS-term-read-warmup`) and treats a 0 as "no reading". A new reader of web rows should do the same; when the economy's start is fixed the warm-up goes to zero.

## The kind of an address

- `address-kind.ts` scores six kinds (crisis, combative, hopeful, victory, mourning, policy) as what the world gives the kind to say times one plus the speaker's mean trait pull (`data/address-kinds.json`). Highest wins, ties by name. No roll. A President in their first year cannot take `victory`.
- A bank piece with `addressKind` belongs to that kind; a kind with pieces of its own for a role says only those and every other kind says the role's general pieces (`variantsFor`). Every piece needs both voices (polished, plain) and, for each, both subjects (`inaugural`, `state-of-the-union`); `english-opening-speech.test.ts` fails on a missing pair. A new area topic needs `<area>-worse` and `<area>-better` pieces with `topic` and `requiresFacts`.
- Generate pieces with a throwaway script and run `npx prettier --write` on the bank after; do not hand-edit a 200-piece file.

## Proving it

- **Unit fixture for the edge:** write web rows the way the web does: one anchor row (`2025-01`) and three rows after the warm-up (`2026-01` to `2026-03`) with every measure of an area moved by the change (`TERM_MEASURES` lists them). `opening-address-kinds.test.ts` and `public-action.test.ts` are the pattern. A fixture with three rows from the opening month reads nothing.
- **Played year:** a year of one town takes about two and a half minutes, so a ten-year address run is a quarter of an hour. Run it in the background with `nohup ... &` and a Monitor on the output file; piping into `tail` shows nothing until the end. `sleep` over a few seconds is blocked.
- **People move.** A participant's `placeId` after six months may be another town's; assert they were adults of the town when they joined, not where they are now.
- **The speech engine's cases are not kept in the durable log.** To see who an action pressed, register a small tap module on `CASE_MADE` (see `public-action.test.ts`).
- The yearly address is recorded by `yearly-address.ts` from the director's `onDay`; the household's `address` scene fires from its `president.address` event like the opening's.
