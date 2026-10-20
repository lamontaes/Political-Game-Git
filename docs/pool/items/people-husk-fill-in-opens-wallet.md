---
id: people-husk-fill-in-opens-wallet
title: "A husk relative filled in when met opens with a wallet that matches the records"
area: people
kind: feature
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Husk-tier relatives open with no cash (liquidMinor 0 in population.ts openingFamilies) and fillInPerson (state.ts) gives a filled-in husk no wallet, so a relative the player meets and who lives in town has nothing in any account while the counted residents around them do. When a husk is filled in, give them the transaction balance a person at their household's recorded income keeps (starting-cash.ts medianTransactionBalance, SCF 2022), taken from the household or the wider population's counted cash so no dollar is created, and mark it ESTIMATED with its spread.

**Rules.** Money is conserved: the dollars come out of the counted tier's cash for the place, never made up. One model, two tiers: a filled-in person matches what the records already say. Estimate, never UNKNOWN.

**Done when.** In a played world (buildBenchWorld, drawn place and seed named) a husk relative who lives in town is filled in by the player meeting them and then holds cash by record id while the place's total cash is unchanged; src/core2/opening-adults-cash.test.ts and the money-conservation guard pass.

**Files.** src/core2/state.ts, src/core2/population.ts, src/core2/opening-adults-cash.test.ts

**Notes.** From the world-opening-husks-in-town-hold-no-cash investigation (#5423): the zero-cash adults there were cabinet heads, but husks hold nothing by design.
