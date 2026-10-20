---
id: core-speed-alloc-counted-births-followers
title: "Counted births and press followers allocate 4 percent of a dense town's year"
area: core
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** An anonymous function in src/core2/births-counted.ts and countedFollowers in src/core2/modules/press.ts allocate 1,265 MB and 1,569 MB in one played year while they walk counted groups. It was found by an allocation profile of a played year in Long Hill, Connecticut (seed m7b, 365 days, 60 GB sampled), where it allocated 4.7 percent (2,830 MB) of the bytes. The year takes 194 to 214 seconds against the 120-second limit, and garbage collection is about 19 percent of it. Cut the allocation without changing any result.

**Rules.** Speed: a town's game year must run in under two minutes and no change may make a year more than 20 percent slower than its base, measured before and after on the same machine, one process at a time. Never scan the whole world or a whole history every day; use indexes or act on the day something changed. One model, two tiers: the result for every counted group and full person stays exactly the same.

**Done when.** Run scripts/speed-years/alloc-profile.ts on seed m7b (Long Hill, Connecticut) before and after: the named function's share of allocated bytes falls by at least half, the year's records are identical (the same journal totals and the same counts of people, fill-ins and cases, by record id), and npm run speed:year -- --seed m7b --exclusive is faster by the share the function took, in the PR body receipts.

**Files.** src/core2/births-counted.ts, src/core2/modules/press.ts

**Notes.** TODO

Built Oct 20 (claude/peaceful-ritchie-03780x, #5076), partly: the births cohort grouping copied its array for every person (now a push) and each outlet's counted-follower count rewalked the counted residents (now the town's adults by band are kept per day's rows). Long Hill, Connecticut, seed m7b, one year, same machine, one process at a time: 267.5 s after against 270.2 s before (and 285.4 against 297.8 in an earlier pair); the year-end fingerprint is identical (809672cc...). Not shown: the function's share of allocated bytes (scripts/speed-years/alloc-profile.ts does not exist), so the "falls by half" line is unmeasured and the gain is within run noise; the year is still over 120 s.
