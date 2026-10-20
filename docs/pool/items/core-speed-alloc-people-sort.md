---
id: core-speed-alloc-people-sort
title: "A sort in src/core2/modules/people.ts allocates 3 percent of a dense town's year"
area: core
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr: #5400
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** A function in src/core2/modules/people.ts sorts a fresh array inside a daily path, and the sort is charged 1,875 MB of allocation in one played year. It was found by an allocation profile of a played year in Long Hill, Connecticut (seed m7b, 365 days, 60 GB sampled), where it allocated 3.1 percent (1,875 MB) of the bytes. The year takes 194 to 214 seconds against the 120-second limit, and garbage collection is about 19 percent of it. Cut the allocation without changing any result.

**Rules.** Speed: a town's game year must run in under two minutes and no change may make a year more than 20 percent slower than its base, measured before and after on the same machine, one process at a time. Never scan the whole world or a whole history every day; use indexes or act on the day something changed. One model, two tiers: the result for every counted group and full person stays exactly the same.

**Done when.** Run scripts/speed-years/alloc-profile.ts on seed m7b (Long Hill, Connecticut) before and after: the named function's share of allocated bytes falls by at least half, the year's records are identical (the same journal totals and the same counts of people, fill-ins and cases, by record id), and npm run speed:year -- --seed m7b --exclusive is faster by the share the function took, in the PR body receipts.

**Files.** src/core2/modules/people.ts

**Notes.** TODO

Sent back 2026-10-20 from PR #5400 (branch claude/political-game-pool-yucp92-t): merging main conflicts in src/core2/modules/people.ts; finish on that branch, merge main into it first.
