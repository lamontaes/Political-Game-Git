---
id: gov-elected-official-seated-without-money
title: "A newly elected state representative takes the seat with no living cost and no cash, so a bribe's pull on them is the whole bribe in cents (Davie, Florida)"
area: gov
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** In Davie, Florida (seed 694f68f1f5df5250, buildBenchWorld, every module, scripts/research/bribe-chain-years.ts), two members elected on May 21, 2026 (official:term:seat:US-FL:lower:001:0:2026-05-21:elected and :002:) were offered bribes for a state schools contract on July 1, 2026 and took them. The corruption engine weighs the bribe against a month of the official's living costs plus their cash plus one cent, and both members had no living cost and no cash that day, so the need term equaled the bribe in cents: 21,704,585 and 8,930,363, where every other official's was below 114. By the end of the run the same members carried the shared state-member living cost (7,314 a day). Find where a newly elected official is seated and give them the person's own living cost and money from the day they are seated, as a filled-in person must match the records.

**Rules.** Two-level population: a filled-in person matches the records from the moment they exist. No dice. One rule, all 56 places: the fix is in the seating path for every office, not a state named in logic.

**Done when.** In Davie, Florida (seed 694f68f1f5df5250) played to July 2026, every official seated by election has a living cost and the person's own money on their first day in office, named by person id and amount, and no take decision's need term exceeds the bribe over a month of that official's own living costs; a test in the seating engine fails if a newly seated official has no living cost.

**Files.** src/core2/modules/corruption.ts, src/core2/modules/elections.ts

**Notes.** Filed Oct 25 by the effects lead from gov-bribes-in-played-worlds-measured. The state members also all open with the same living cost and cash (7,314 a day and 346,921), which may be the same seating path.
