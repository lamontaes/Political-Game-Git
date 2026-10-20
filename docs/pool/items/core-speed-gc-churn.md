---
id: core-speed-gc-churn
title: "Garbage collection is 21 percent of a dense town's year (52 of 251 seconds): find what allocates per day"
area: core
kind: cleanup
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** In the CPU profile of a played year in Long Hill, Connecticut (seed m7b, 251 seconds), the garbage collector takes 52 seconds, the largest single line. A trace of the same year shows 4,539 young-generation scavenges taking 32 seconds, about 7 ms each, so many objects survive each one, and the heap peaks near 2.5 GB. Take a sampling heap profile of the year, name the three biggest allocators by file and function, and change each to reuse its storage or act on the day something changed. A larger young generation (--max-semi-space-size=128) ran the year in 169 seconds against 182 to 214, which is worth setting where the play process starts, but is not the fix.

**Rules.** Speed: a town's game year must run in under two minutes and no change may make a year more than 20 percent slower than its base. Never scan the whole world or a whole history every day; use indexes or act on the day something changed. Replace, never layer: the wasteful path is deleted, not kept beside the new one.

**Done when.** A sampling heap profile of npm run speed:year -- --seed m7b --exclusive in the played world before and after names the three allocators and shows garbage collection below 10 percent of the year, with the year faster by the same measure and the golden-path suite and the money-balance tests still passing.

**Files.** src/core2/state.ts, src/core2/journal-state.ts, src/core2/module-state.ts, src/core2/life.ts

**Notes.** TODO

Oct 20 (claude/speed-free-block): two checks that the rules put behind bookkeeping still ran in play. `portfolios` (`journal-state.ts`) read the property descriptor of every account of every touched owner on every posting (`directField`); it now does so only while bookkeeping is on. `FinanceReadGuard` (`finance-plan.ts`) allocated five maps and an array in each instance even when it records nothing; it now builds them only while bookkeeping is on. Same sampling profile, seed m7b, Long Hill, Connecticut: native `getOwnPropertyDescriptor` 0.94 -> 0.37 GB, `Map` 1.39 -> 1.16, the year 58.2 -> 57.3 GB allocated; the profiled year 168 seconds (one run, about 10 percent noise). The finance-plan (44), work-attendance (28), work-pay-period (18), player-control-state (9), journal, journal-state, journal-facade and bookkeeping tests pass. The `candidates` sort in `free-block.ts` named earlier is the tie key that `pairKey` (#5409) replaces, so it needs no change here. Still open: `projectCashJournal`'s BigInt arithmetic, `scoreOffers`, `planFreeTime`, the `WeakSet` in finance-plan's `payload` (0.37 GB, unchanged), and the rest of `portfolios` (1.37 GB: it snapshots every account of an owner on each posting, which the residual account's arithmetic needs).
