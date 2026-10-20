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

Sampling heap profile Oct 20 (claude/speed-gc): `HeapProfiler.startSampling` with collected objects included, over one year of seed m7b (Long Hill, Connecticut, key 0943580), 58 GB allocated in the year (the year ran 215 seconds under the profiler). By file: `journal-state.ts` 6.6 GB, `residents.ts` 3.2, `journal.ts` 3.0, `work-pay-period.ts` 2.6, `news.ts` 1.8, `choice.ts` 1.6, `counted-groups.ts` 1.5, `births-counted.ts` 1.5, `free-block.ts` 1.4; the rest is spread thin, and about 16 GB sits under native frames (`sort`, `next`, `Map`, `set`, `Set`, `getOwnPropertyDescriptor`). By function: `postCashJournal` 2.9 GB, `projectCashJournal` 2.6, `releaseResidentHousehold` 1.9, `portfolios` 1.4, `countedFollowers` 1.3 (fixed in `core-speed-press-counted-followers`), `births-counted` closure 1.25, `scoreOffers` 1.25, `planFreeTime` 1.0, `availableActs` 0.9, `guardedRecord` 0.9, `countedResidents` 0.9. The cash journal (`postCashJournal` and what it calls) allocates the most: every posting copies its rows and its source, builds an array of 13 runtime fields and a pair array per field on each call (`originalMaps`, used only when bookkeeping is on), and keeps a write list with a frozen copy of each result. That is the money-conservation core, so cutting it needs the money-balance tests and the golden-path suite run before and after, and is the place to start. The native `sort` and `Map`/`Set` frames need a call-site profile (run the same year with `--cpu-prof` and read the callers of `sort`) to name the code behind them.

Oct 20 (claude/speed-score-terms): done from the note above. `scoreOffers` now copies each offer's reason terms (the binding, its arguments, its source ids) only for an actor whose reasons are saved (the player, the focus, a controlled person, anyone while the observer is on) or when a caller asks for them (`chooseAct`'s original-answer capture); everyone else keeps each reason's number and no copy. Same sampling profile, seed m7b: `scoreOffers` 1.25 -> 1.07 GB; the year's total 58.2 -> 58.4 GB is inside the run-to-run spread (about 1 GB), so the change is small. Saved-trace (33), choice-qualifiers (11), event-appraisal-hooks (21) and business (14) tests pass.

Sent back 2026-10-20 from PR #5451 (branch claude/gc-churn-alloc): The docs-only profile is useful, but core-speed-gc-churn Done when requires before/after heap profiles showing garbage collection below 10 percent, a faster year, and passing golden-path and money-balance checks. This PR explicitly ships neither attempted change and provides no below-10-percent after measurement. It cannot mark that implementation item done. Track the completed profiling note separately while leaving the implementation open, or finish the named acceptance.; finish on that branch, merge main into it first.
