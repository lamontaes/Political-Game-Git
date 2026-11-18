# The played state's part and rest

Part of the `nation` skill. Written as its own skill by World B on Nov 17, 2026 and folded here under the skills policy (a new skill retires one). Use when a figure of the played state looks wrong, or when changing `stepCountry`, `takeOutPart`, `putInPart`, `resolveCountryPart`, `townPartCounts` or `residentsPart`.

The country tier (`src/core2/country-model.ts`) holds every state as cells of people and sectors of jobs. The state the player lives in is counted in two pieces each month (`runMonth` in `src/core2/modules/macro.ts`):

1. `townPartCounts` counts the played town and its county from their own records (`residentsPart` in `src/core2/modules/residents.ts`): adults by age band, at work, looking, children, jobs by sector, cash.
2. `takeOutPart` takes last month's count out of the state's cells. What is left is the rest.
3. `stepCountry` steps the rest like any state.
4. `putInPart` puts today's count back. The state's figure is the rest plus the part.

So every figure of the played state is two things added, and the rest is whatever the part leaves. A wrong count in the part does not show in the part. It shows as a rest with the wrong people, and the tier then reacts to that rest as if it were real.

## Probe it before you theorize

Write a script that builds a played world at the place the fault was seen (`buildBenchWorld(seed, gameStartDate(), { twoLevel: true, placeKey })`), advances a month at a time, and prints from the macro module's tables:

- `countryStates` row for the state: `cells` summed by age band (people, workers, seekers), `sectors` (jobs), `matchEfficiency`, `openingsPerJobAdded`, `whatMoved.at(-1)` (jobs added and cut by sector).
- `countryParts` row: the part's people, workers and seekers by band, jobs by sector.
- The rest, by subtraction, and each one's share looking.

Print two other states beside it (one large, one small). A fault only in the played state is in the part or the take-out; a fault in every state is in the tier itself.

To see inside a month, add one `console.error` in `stepCountry` behind `parts.has(state)` and take it out before you commit: per sector `jobs`, `staffNeeded`, `staffNeeded / jobs`, `ended`, `posted`. A sector far from 1.00 in the first month means the rest opened out of balance.

## The traps (all four were live on Nov 17)

- **The first month fits constants.** `matchEfficiency` and `openingsPerJobAdded` are fitted in the tier's first month and fixed. Anything wrong with the rest in that one month is kept for the whole game. Check the fitted values against other states (0.1 to 0.4 is usual; 1.2 hired three in four seekers a month).
- **A sampled county is a sample of workers.** A county is held as a few thousand household records, some standing for thousands of households (`weightOf`). Each sampled worker is named by a county employer (`h.employment`), and the same record's `unplacedWorkers` counts those same workers. `unplacedWorkers` is the count the world moves (regional work found, away work lost); the name gives the sector. Never add the two.
- **The county's sectors come from a survey of private employers** (County Business Patterns, `countySectorEmployment`). It has no government. Until the sample carries ownership, the tier counts the state's own government share of those workers in government (stopgap `SG-NATION-county-sample-no-government`).
- **The part's jobs are not in the state's proportions,** so the rest's people want more of some sectors than its firms sell. The first month balances the rest by the opening's own rule (stopgap `SG-NATION-rest-buys-from-the-part-fixed-share`).
- **A record that stands for many moves in blocks.** One seeker row of a record standing for 2,380 households is not 2,380 people looking: it stands for the record's people without work. Expect the played state's rate to move in steps when such a record loses or finds away work.

## What a fix must show

- Replay the place where the fault was measured, on the fix, for a year, before drawing other places (`played-world-proof`).
- A world with no played part is unchanged to the last digit: hash every state's cells and sectors after 120 months on both heads.
- Sweep the pure tests over all 56 (`drawn-place-tests`).
- `country-town-part.test.ts` still passes: a closed employer's jobs leave the state's count.
- One world at a time while a long run plays (`heavy-runs`). A probe beside a 10-year run killed both.

## Stop condition

The state's figure at the measured place holds where it opened and moves with recorded layoffs and hires, the rest's sectors open at 1.00, and each drawn place's result is printed beside the part's share of its state.
