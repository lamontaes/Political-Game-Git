---
id: laws-minimum-wage-rates-before-2026
title: "Minimum wage rates before July 2025 for the states the dated table starts late"
area: laws
kind: research
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** `data/research/money/minimum-wage-dated-matrix-2026.json` holds no rate dated before July 2025 for most states (Alaska starts July 1, 2025; Michigan, South Dakota and Virginia start January 1, 2026; the District starts July 1, 2025). A world that starts before the first row therefore opens at the federal floor in those states, though the state's own rate was higher. Research the rate in force on January 1 of each year from 2024 to 2026 for every place whose first row is later, with the source and the quote, and add the rows.

**Rules.** Research before building: real data checks the simulation. One rule, all 56 places: the rows live in data, with no place named in code. Each row carries the date it took effect, never backdated, and its source quote. Rows with no source stay out, not guessed.

**Done when.** For every one of the 56 places the table holds a dated row on or before January 1, 2024, or states that the federal floor governed then, with a source. `src/core2/population-start-law.test.ts` then runs with a start of January 1, 2025 as well as January 1, 2026, in a drawn place and seed it names, and passes.

**Files.** data/research/money/minimum-wage-dated-matrix-2026.json, scripts/research/build-starting-law.py, src/core2/data/laws/starting-law.json

**Notes.** Found while building core-opening-pay-reads-start-law (PR 4649), which reads the starting law for the start-day floor. The test there starts on January 1, 2026 because that is the earliest day the table can prove.
