---
id: gov-elected-official-seated-without-money
title: "A newly elected state representative takes the seat with no living cost and no cash, so a bribe's pull on them is the whole bribe in cents (Davie, Florida)"
area: gov
kind: bug
priority: 3
size: S
status: merged
claimed-by: claude/pool-gov-elected-official-seated-without-money
pr: #8537
blocked-on:
source: added with npm run pool -- add
after:
lead: governing
standard: 2
model: sonnet
effort: medium
root: none
checked: fable 2026-11-10
claimed-at: 2026-11-11T03:35:11.707Z
merged-at: 2026-11-12T21:12:42.653Z
---

**What.** A newly elected state representative takes the seat with no living cost and no cash, so a bribe's pull on them is the whole bribe in cents. In Davie, Florida (seed 694f68f1f5df5250, `buildBenchWorld`, every module, `scripts/research/bribe-chain-years.ts`), two members elected on May 21, 2026 (official:term:seat:US-FL:lower:001:0:2026-05-21:elected and :002:) were offered bribes for a state schools contract on July 1, 2026 and took them. The corruption engine weighs the bribe against a month of the official's living costs plus their cash plus one cent, and both members had no living cost and no cash that day, so the need term equaled the bribe in cents (21,704,585 and 8,930,363, where every other official's was below 114). By the end of the run the same members carried the shared state-member living cost (7,314 a day). The state members also all open with the same living cost and cash (7,314 a day and 346,921), which may be the same seating path. Seen: an official's card, which shows real money and living costs, and the bribe's pull on them.

**Cause.** Measured: Davie, Florida, seed 694f68f1f5df5250, via `scripts/research/bribe-chain-years.ts`: two members elected 2026-05-21 took bribes on 2026-07-01 with no living cost and no cash that day (need terms 21,704,585 and 8,930,363). The seating path is `takeOffice` in `src/core2/modules/voting.ts` and the offices seating in `src/core2/modules/elections.ts`.

**Fix.** Find where a newly elected official is seated and give them the person's own living cost and money from the first day, as a filled-in person must match the records, and add a test in the seating engine that fails when a newly seated official has no living cost.

**Time box.** 3 hours for one sonnet session.

**Rules.** Two-level population: a filled-in person matches the records from the moment they exist. No dice. One rule, all 56 places: the fix is in the seating path for every office, not a state named in logic.

**Done when.** A second session plays the drawn place Davie, Florida (seed 694f68f1f5df5250) to July 2026 and sees every official seated by election have a living cost and the person's own money on their first day in office, named by person id and amount, and no take decision's need term exceed the bribe over a month of that official's own living costs. A test in the seating engine fails if a newly seated official has no living cost.

**Waits on.** Nothing.

**Files.** src/core2/modules/voting.ts, src/core2/modules/elections.ts, src/core2/modules/corruption.ts, scripts/research/bribe-chain-years.ts

**Notes.** Filed Oct 25 by the effects lead from gov-bribes-in-played-worlds-measured. The state members also all open with the same living cost and cash (7,314 a day and 346,921), which may be the same seating path.

Deferred Oct 25: nothing on screen reads it yet.
