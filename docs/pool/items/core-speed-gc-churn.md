---
id: core-speed-gc-churn
title: "Garbage collection is 21 percent of a dense town's year (52 of 251 seconds): find what allocates per day"
area: core
kind: cleanup
priority: 2
size: M
status: claimed
claimed-by: claude/speed-cash-journal
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T01:31:49.554Z
---

**What.** In the CPU profile of a played year in Long Hill, Connecticut (seed m7b, 251 seconds), the garbage collector takes 52 seconds, the largest single line. A trace of the same year shows 4,539 young-generation scavenges taking 32 seconds, about 7 ms each, so many objects survive each one, and the heap peaks near 2.5 GB. Take a sampling heap profile of the year, name the three biggest allocators by file and function, and change each to reuse its storage or act on the day something changed. A larger young generation (--max-semi-space-size=128) ran the year in 169 seconds against 182 to 214, which is worth setting where the play process starts, but is not the fix.

**Rules.** Speed: a town's game year must run in under two minutes and no change may make a year more than 20 percent slower than its base. Never scan the whole world or a whole history every day; use indexes or act on the day something changed. Replace, never layer: the wasteful path is deleted, not kept beside the new one.

**Done when.** A sampling heap profile of npm run speed:year -- --seed m7b --exclusive in the played world before and after names the three allocators and shows garbage collection below 10 percent of the year, with the year faster by the same measure and the golden-path suite and the money-balance tests still passing.

**Files.** src/core2/state.ts, src/core2/journal-state.ts, src/core2/module-state.ts, src/core2/life.ts

**Notes.** TODO

Oct 20 (claude/speed-cash-journal): first cut, partial. `postCashJournal` built, on every posting, a 13-entry list of the runtime maps, a copy of the running totals and a copy of each touched owner's and account's totals, and read them only in the bookkeeping checks. They are now built only while bookkeeping is on (play has it off). Same sampling heap profile of seed m7b, Long Hill, Connecticut: `postCashJournal` 2.91 -> 2.42 GB, the year 58.2 -> 56.6 GB allocated (about 3 percent); the year's wall time (213 seconds under the profiler) did not move. The journal, journal-state, journal-facade, bookkeeping, counted-money, budgets-public-pay and cannabis-sales-law tests pass. `projectCashJournal` (2.57 GB) already skips its checks in play, so what is left in it is the BigInt arithmetic and Maps of the posting itself, and `portfolios` (1.36 GB), `releaseResidentHousehold` (1.9 GB), the births-counted closure (1.25 GB), `scoreOffers` (1.25 GB) and the native `sort` and `Map` frames are untouched. Still open: garbage collection is not yet below 10 percent of the year.
Oct 20 (claude/speed-release): `releaseResidentHousehold` (1.9 GB, the third-largest allocator) is the purchase-flow copy already in PR #5057 (`core-release-household-copies-purchase-parts`): its purchase branch copies a merged flow's whole parts map with `{ ...present }` on every release, where the wages branch already uses `ownMap` (copied once, then reused). Tried here and dropped: building the employer calendars map once instead of per release, and iterating flows instead of spreading them into an array; the same sampling profile showed 1.88 -> 1.87 GB, no effect. So this allocator waits on #5057, not on new work. What remains for this item after #5057 and #5388: `projectCashJournal` 2.57 GB, `portfolios` 1.36, the births-counted closure 1.25, `scoreOffers` 1.25, `planFreeTime` 1.0, `availableActs` 0.9, and the native `sort`/`Map`/`Set` frames (about 16 GB), which need a call-site profile.
