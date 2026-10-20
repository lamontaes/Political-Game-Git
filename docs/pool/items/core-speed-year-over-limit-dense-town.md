---
id: core-speed-year-over-limit-dense-town
title: "A dense town's game year takes 194 to 214 seconds, over the 120-second limit (Long Hill, Connecticut, seed m7b)"
area: core
kind: bug
priority: 1
size: M
status: blocked
claimed-by: claude/political-game-pool-yucp92-v
pr: #5372
blocked-on: its children, the core-speed-* items (alloc, journal, date parse, gc churn, pair key); this umbrella is done when they bring the year under 120 s
source: added with npm run pool -- add
claimed-at: 2026-10-20T02:16:59.281Z
---

**What.** Measured Oct 20, 2026 on a 4-core cloud container with nothing else running: npm run speed:year -- --seed m7b --exclusive, a played year in Long Hill, Connecticut, takes 194, 200 and 214 seconds in three runs, over the 120-second limit in AGENTS.md. The same command on seed m7a, Discovery Harbour, Hawaii, takes 52 seconds, so the cost follows the town's size. A CPU profile of the 251 seconds shows no single hotspot: garbage collection is 52 seconds, and the largest named functions are 3 to 6 seconds each. This umbrella item is done when the parts filed beside it, found by that profile, bring the year under the limit.

**Rules.** Speed: a town's game year must run in under two minutes and no change may make a year more than 20 percent slower than its base, measured before and after on the same machine, one process at a time. Never scan the whole world or a whole history every day; use indexes or act on the day something changed. One rule, all 56 places: the check draws its place from all 56 and names it and the seed.

**Done when.** npm run speed:year -- --seed m7b --exclusive on the same container finishes the played year in Long Hill, Connecticut in under 120 seconds in three runs, and seed m7a stays within 20 percent of its 52 seconds; the receipts from before and after go in the PR body with the profile's top functions.

**Files.** src/core2/life.ts, src/core2/modules/press.ts, src/core2/kernel/dates.ts, scripts/speed-years/run.ts

**Notes.** Profiled Oct 20 (seed m7b, Long Hill, CT, 4 cores): 176.6 s wall, 210 s sampled. Self time: garbage collector 38.9 s; postCashJournal 5.9; makeIsoDate 4.3; releaseResidentHousehold 4.2; projectCashJournal 4.0; people.ts anon 3.6; parameter 3.4 (already map-cached); state.ts anon 3.2; portfolios 2.5; countedFollowers 2.4; availableActs 2.2. Flat: no function above 6 s, so the cut has to come from allocation churn (GC is 19%) and several 2 to 6 s items. Child filed: core-speed-cash-journal-posting. Next steps: a heap allocation profile (--heap-prof) to find what churns the GC, then children per top allocator.

Re-measured Oct 20 (claude, claude/speed-dense-note), 4-core container, main at the time, nothing else running, `npm run speed:year -- --seed m7b --exclusive` twice: 150.9 s and 148.9 s (under profiling), against 194 to 214 s in the first measurement, so the year is already about 40 s faster than that note (other sessions' merged speed work), and still about 30 s over the limit. CPU profile of the 150.9 s run (178 s sampled): garbage collector 27.9 s; postCashJournal 5.1, releaseResidentHousehold 3.9, makeIsoDate 3.7, projectCashJournal 3.4, parameter 3.3, people.ts 3.2, state.ts 2.8, portfolios 2.1, availableActs 2.0, countedFollowers 2.0, recordWorkAttendance 1.9, guardedRecord 1.6, epochDayOf 1.6, monthBoundary 1.4. Three small slices are in draft PRs and together address about 8 s of that list: #5381 (day counts from dates held as text: makeIsoDate and epochDayOf), #5385 (payroll boundary dates kept: monthBoundary) and #5392 (no payday record copy in play: guardedRecord). That leaves roughly 22 s to find. A heap profile at exit (live objects, 914 MB) puts the largest retained user allocations in `scoreOffers` (46 MB) and `decisionFromScores` (23 MB) in choice.ts, `plainCopy` in module-data.ts (25 MB), `synthesizeNationwidePlace` in place-lookup.ts (24 MB) and `personInput` in counted-groups.ts (14 MB); that shows what is held, not what churns, so the GC cost still needs an allocation-site profile (the churn, not the survivors) before a child item can be written. The flat list has no single function over 5.1 s, so the remaining time is several 2 to 5 s items: journal posting (10.6 s across three functions, item core-speed-cash-journal-posting), fill-in (`releaseResidentHousehold`, 3.9 s), `parameter` (3.3 s, already map-cached, so the cost is call count) and `countedFollowers` (item core-speed-press-counted-followers).
