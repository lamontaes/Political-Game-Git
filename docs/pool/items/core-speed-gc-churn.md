---
id: core-speed-gc-churn
title: "Garbage collection is 21 percent of a dense town's year (52 of 251 seconds): find what allocates per day"
area: core
kind: cleanup
priority: 2
size: M
status: claimed
claimed-by: claude/speed-people-sort
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T01:57:48.777Z
---

**What.** In the CPU profile of a played year in Long Hill, Connecticut (seed m7b, 251 seconds), the garbage collector takes 52 seconds, the largest single line. A trace of the same year shows 4,539 young-generation scavenges taking 32 seconds, about 7 ms each, so many objects survive each one, and the heap peaks near 2.5 GB. Take a sampling heap profile of the year, name the three biggest allocators by file and function, and change each to reuse its storage or act on the day something changed. A larger young generation (--max-semi-space-size=128) ran the year in 169 seconds against 182 to 214, which is worth setting where the play process starts, but is not the fix.

**Rules.** Speed: a town's game year must run in under two minutes and no change may make a year more than 20 percent slower than its base. Never scan the whole world or a whole history every day; use indexes or act on the day something changed. Replace, never layer: the wasteful path is deleted, not kept beside the new one.

**Done when.** A sampling heap profile of npm run speed:year -- --seed m7b --exclusive in the played world before and after names the three allocators and shows garbage collection below 10 percent of the year, with the year faster by the same measure and the golden-path suite and the money-balance tests still passing.

**Files.** src/core2/state.ts, src/core2/journal-state.ts, src/core2/module-state.ts, src/core2/life.ts

**Notes.** TODO

Oct 20 (claude/speed-people-sort): the call sites behind the native frames, from the same sampling profile (seed m7b, Long Hill, Connecticut), by nearest code frame: `sort` 1.94 GB in an anonymous function in `src/core2/modules/people.ts`, `next` 0.81 GB in `liveHouseholds` (`counted-groups.ts`), `getOwnPropertyDescriptor` 0.62 GB in `portfolios` and 0.22 in `shallow` (`work-attendance.ts`), `sort` 0.62 GB in `candidates` (`free-block.ts`), `WeakSet` 0.36 GB in `payload` (`finance-plan.ts`), `Map` 0.31 GB in `countedResidents`. The `people.ts` sort is the tie id `[a, b].sort().join(":")`, built for every known person of every person who acts; 16 places did it. They now call `pairKey(a, b)` (`src/core2/pair-key.ts`), the same string. Same profile after: `sort` 3.35 -> 0.6 GB, the year 58.2 -> 54.4 GB allocated (6.5 percent), the profiled year 215 -> 186 seconds, and `npm run speed:year -- --seed m7b --exclusive` 171 seconds against 194 to 214 before (one run; the machine varies about 10 percent). Still open: `liveHouseholds`, `portfolios`' descriptor reads, `candidates`' sort, `projectCashJournal`, `scoreOffers`, `planFreeTime`; garbage collection is not yet below 10 percent of the year, and the year is not yet under 120 seconds.
