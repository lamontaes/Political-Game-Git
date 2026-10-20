---
id: core-speed-alloc-counted-iterators
title: "Counted-group iterators materialize 4 percent of a dense town's year"
area: core
kind: bug
priority: 2
size: M
status: claimed
claimed-by: claude/political-game-pool-7xkkii
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T01:48:37.925Z
---

**What.** liveHouseholds in src/core2/counted-groups.ts, countedResidents in src/core2/electorate.ts and countedHouseholdsByPlace in src/core2/modules/residents.ts walk or copy every counted household for each caller, about 2,900 MB in one played year. It was found by an allocation profile of a played year in Long Hill, Connecticut (seed m7b, 365 days, 60 GB sampled), where it allocated 4.3 percent (2,900 MB) of the bytes. The year takes 194 to 214 seconds against the 120-second limit, and garbage collection is about 19 percent of it. Cut the allocation without changing any result.

**Rules.** Speed: a town's game year must run in under two minutes and no change may make a year more than 20 percent slower than its base, measured before and after on the same machine, one process at a time. Never scan the whole world or a whole history every day; use indexes or act on the day something changed. One model, two tiers: the result for every counted group and full person stays exactly the same.

**Done when.** Run scripts/speed-years/alloc-profile.ts on seed m7b (Long Hill, Connecticut) before and after: the named function's share of allocated bytes falls by at least half, the year's records are identical (the same journal totals and the same counts of people, fill-ins and cases, by record id), and npm run speed:year -- --seed m7b --exclusive is faster by the share the function took, in the PR body receipts.

**Files.** src/core2/counted-groups.ts, src/core2/electorate.ts, src/core2/modules/residents.ts

**Notes.** TODO
