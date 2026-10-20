---
id: core-speed-gc-churn
title: "Garbage collection is 21 percent of a dense town's year (52 of 251 seconds): find what allocates per day"
area: core
kind: cleanup
priority: 2
size: M
status: claimed
claimed-by: claude/gc-churn-alloc
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T02:59:48.483Z
---

**What.** In the CPU profile of a played year in Long Hill, Connecticut (seed m7b, 251 seconds), the garbage collector takes 52 seconds, the largest single line. A trace of the same year shows 4,539 young-generation scavenges taking 32 seconds, about 7 ms each, so many objects survive each one, and the heap peaks near 2.5 GB. Take a sampling heap profile of the year, name the three biggest allocators by file and function, and change each to reuse its storage or act on the day something changed. A larger young generation (--max-semi-space-size=128) ran the year in 169 seconds against 182 to 214, which is worth setting where the play process starts, but is not the fix.

**Rules.** Speed: a town's game year must run in under two minutes and no change may make a year more than 20 percent slower than its base. Never scan the whole world or a whole history every day; use indexes or act on the day something changed. Replace, never layer: the wasteful path is deleted, not kept beside the new one.

**Done when.** A sampling heap profile of npm run speed:year -- --seed m7b --exclusive in the played world before and after names the three allocators and shows garbage collection below 10 percent of the year, with the year faster by the same measure and the golden-path suite and the money-balance tests still passing.

**Files.** src/core2/state.ts, src/core2/journal-state.ts, src/core2/module-state.ts, src/core2/life.ts

**Notes.** TODO

Sampling heap profile Oct 20 (claude/speed-gc): `HeapProfiler.startSampling` with collected objects included, over one year of seed m7b (Long Hill, Connecticut, key 0943580), 58 GB allocated in the year (the year ran 215 seconds under the profiler). By file: `journal-state.ts` 6.6 GB, `residents.ts` 3.2, `journal.ts` 3.0, `work-pay-period.ts` 2.6, `news.ts` 1.8, `choice.ts` 1.6, `counted-groups.ts` 1.5, `births-counted.ts` 1.5, `free-block.ts` 1.4; the rest is spread thin, and about 16 GB sits under native frames (`sort`, `next`, `Map`, `set`, `Set`, `getOwnPropertyDescriptor`). By function: `postCashJournal` 2.9 GB, `projectCashJournal` 2.6, `releaseResidentHousehold` 1.9, `portfolios` 1.4, `countedFollowers` 1.3 (fixed in `core-speed-press-counted-followers`), `births-counted` closure 1.25, `scoreOffers` 1.25, `planFreeTime` 1.0, `availableActs` 0.9, `guardedRecord` 0.9, `countedResidents` 0.9. The cash journal (`postCashJournal` and what it calls) allocates the most: every posting copies its rows and its source, builds an array of 13 runtime fields and a pair array per field on each call (`originalMaps`, used only when bookkeeping is on), and keeps a write list with a frozen copy of each result. That is the money-conservation core, so cutting it needs the money-balance tests and the golden-path suite run before and after, and is the place to start. The native `sort` and `Map`/`Set` frames need a call-site profile (run the same year with `--cpu-prof` and read the callers of `sort`) to name the code behind them.

Oct 20 (claude/speed-score-terms): done from the note above. `scoreOffers` now copies each offer's reason terms (the binding, its arguments, its source ids) only for an actor whose reasons are saved (the player, the focus, a controlled person, anyone while the observer is on) or when a caller asks for them (`chooseAct`'s original-answer capture); everyone else keeps each reason's number and no copy. Same sampling profile, seed m7b: `scoreOffers` 1.25 -> 1.07 GB; the year's total 58.2 -> 58.4 GB is inside the run-to-run spread (about 1 GB), so the change is small. Saved-trace (33), choice-qualifiers (11), event-appraisal-hooks (21) and business (14) tests pass.

Oct 20 (claude, claude/gc-churn-alloc): measured, not changed. A sampling heap profile that counts objects the collector already freed (V8 `HeapProfiler.startSampling` with `includeObjectsCollectedByMinorGC` and `includeObjectsCollectedByMajorGC`, 64 KiB interval, started after the world is built; the default `--heap-prof` shows only what is alive at the end and hides churn) of one played year in Long Hill, Connecticut (0943580, seed m7b, bookkeeping off, `node --max-old-space-size=8192`): the year took 169 seconds, build 29 seconds, and the sampler saw 59.8 GB allocated. The biggest allocators by function (MB of 59,830 sampled):

| MB                    | function                                              | file                                         |
| --------------------- | ----------------------------------------------------- | -------------------------------------------- |
| 5,176                 | `next` (iterator results)                             | built in, from `for...of` over Maps and Sets |
| 4,115                 | `sort`                                                | built in, array copies for sorts             |
| 2,621                 | `projectCashJournal`                                  | src/core2/journal.ts                         |
| 1,543                 | `releaseResidentHousehold`                            | src/core2/modules/residents.ts               |
| 1,535                 | `portfolios`                                          | src/core2/journal-state.ts                   |
| 1,481                 | `scoreOffers`                                         | src/core2/choice.ts                          |
| 1,261                 | anonymous                                             | src/core2/births-counted.ts                  |
| 1,200                 | `countedFollowers`                                    | src/core2/modules/press.ts                   |
| 1,123                 | `availableActs`                                       | src/core2/life.ts                            |
| 1,099                 | `recentStoriesHeard`                                  | src/core2/modules/news.ts                    |
| 1,023                 | `planFreeTime`                                        | src/core2/free-block.ts                      |
| 914 / 967 / 864 / 624 | `postCashJournal`, anonymous, `volumes`, `plusTotals` | src/core2/journal-state.ts                   |

The cash journal (`journal.ts` plus `journal-state.ts`) is the largest cluster, about 7.5 GB: it does its money arithmetic in `BigInt` per posting (`projectCashJournal`'s `deltas`, `credits`, `debits`; `plusTotals`; `volumes`, which also builds a two-element array of maps per posting), copies each touched owner's whole account index (`ids = [...index]`) and a snapshot of every account of every touched owner (`portfolios`), for rollback that play never needs. That is the first change to make: number arithmetic with a `Number.isSafeInteger` check and a `BigInt` fallback only on overflow, and no per-posting tuple arrays or account snapshots when bookkeeping is off. Not done in this change because it rewrites the money path and each step needs the money-balance tests and a before and after year on the same quiet machine, which is a core session's job. The next clusters are the per-day sorts and iterator results in `scoreOffers`, `availableActs`, `planFreeTime` (the people loop) and `countedFollowers` and `recentStoriesHeard` (the press and news reads, which scan counted followers and stories each day instead of on the day something changed). The profiler script is a 30-line wrapper; it can be rebuilt from this note.

Tried and measured (Oct 20, same branch): the first change in the note above, number arithmetic with an overflow check in place of `BigInt` per posting in `journal.ts` (`projectCashJournal`) and `journal-state.ts` (`plusTotals`, `volumes`, with a `BigInt` fallback only on overflow). It passed the 104 journal and account tests and left the year's end-state fingerprint identical (`0b9c2dcc…1214`), but the m7b year ran 161.4 seconds against 162.7 on clean main, one process each on the same machine: under 1 percent, inside run-to-run noise. So the `BigInt` arithmetic is not what the garbage collector is paying for, and the change was not shipped. The allocation cost in the journal is the retained snapshots and copies (`portfolios`' account snapshots and `[...index]`, `copyProjection`, receipts), which are objects that live across a scavenge, not the short-lived `BigInt`s. The next try is `portfolios` and `postCashJournal` skipping their rollback snapshots when bookkeeping is off.

Second try, also not shipped (Oct 20): `portfolios` in `journal-state.ts` reading the live account rows in place of per-account copies (`{...live, source: {...}}`) and skipping the outside-flow copies when bookkeeping is off. Journal tests pass (98) and the end-state fingerprint is identical again, but the m7b year took 170.1 seconds against 162.7 on clean main and 161.4 with the first change, so run-to-run noise on this machine is about 5 percent and neither change is measurable. Only a change that removes whole classes of allocation per day (the per-day sorts and iterator results in the people loop, the press and news scans of counted followers and stories) can move a 21 percent garbage-collection share, and each of those needs its own before and after year with the sampling profiler above, not a micro-change in the journal.
