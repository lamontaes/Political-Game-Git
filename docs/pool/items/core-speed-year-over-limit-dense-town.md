---
id: core-speed-year-over-limit-dense-town
title: "A dense town's game year takes 194 to 214 seconds, over the 120-second limit (Long Hill, Connecticut, seed m7b)"
area: core
kind: bug
priority: 1
size: M
status: claimed
claimed-by: claude/dense-town-speed
pr: #5372
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T01:26:33.978Z
---

**What.** Measured Oct 20, 2026 on a 4-core cloud container with nothing else running: npm run speed:year -- --seed m7b --exclusive, a played year in Long Hill, Connecticut, takes 194, 200 and 214 seconds in three runs, over the 120-second limit in AGENTS.md. The same command on seed m7a, Discovery Harbour, Hawaii, takes 52 seconds, so the cost follows the town's size. A CPU profile of the 251 seconds shows no single hotspot: garbage collection is 52 seconds, and the largest named functions are 3 to 6 seconds each. This umbrella item is done when the parts filed beside it, found by that profile, bring the year under the limit.

**Rules.** Speed: a town's game year must run in under two minutes and no change may make a year more than 20 percent slower than its base, measured before and after on the same machine, one process at a time. Never scan the whole world or a whole history every day; use indexes or act on the day something changed. One rule, all 56 places: the check draws its place from all 56 and names it and the seed.

**Done when.** npm run speed:year -- --seed m7b --exclusive on the same container finishes the played year in Long Hill, Connecticut in under 120 seconds in three runs, and seed m7a stays within 20 percent of its 52 seconds; the receipts from before and after go in the PR body with the profile's top functions.

**Files.** src/core2/life.ts, src/core2/modules/press.ts, src/core2/kernel/dates.ts, scripts/speed-years/run.ts

**Notes.** Profiled Oct 20 (seed m7b, Long Hill, CT, 4 cores): 176.6 s wall, 210 s sampled. Self time: garbage collector 38.9 s; postCashJournal 5.9; makeIsoDate 4.3; releaseResidentHousehold 4.2; projectCashJournal 4.0; people.ts anon 3.6; parameter 3.4 (already map-cached); state.ts anon 3.2; portfolios 2.5; countedFollowers 2.4; availableActs 2.2. Flat: no function above 6 s, so the cut has to come from allocation churn (GC is 19%) and several 2 to 6 s items. Child filed: core-speed-cash-journal-posting. Next steps: a heap allocation profile (--heap-prof) to find what churns the GC, then children per top allocator.

Measured Oct 20 (claude, main at the time): `npm run speed:year -- --seed m7b --exclusive` took 173.2 s for the Long Hill, Connecticut year (built in 27.8 s). A CPU profile of the first 120 days after the build (50.8 s of play, inclusive times from the profile tree): `advanceCore` 38.8 s, of which `runModuleCalendar` 17.6 s (the calendar work of every module), `onDay` in `modules/work.ts` 6.6 s, `postJournal` 5.8 s (`postCashJournal` 5.5), `fillInPerson` 3.7 s, `settleWorkPayroll` 2.8 s, `releaseResidentHousehold` 2.9 s, `transferSplit` 2.8 s, `countedPayment` 2.4 s, `relationship` 2.2 s; the garbage collector 17.9 s across the whole run. Of the 3.7 s in `fillInPerson`, 3.4 s is called from `bringCases` in `modules/constituent-cases.ts`: a resident who brings a case to an official is filled in first, so office hours fill in people by design. No function is above 20 percent of `advanceCore` and nothing named here is an accidental scan. A heap-allocation profile run (`--heap-prof`) shows only what is live at the end (module code, place tables) and does not show churn; a useful allocation view needs `--trace-gc` counts by phase or an allocation timeline. The cut has to come from the several 2 to 6 s items together (fill-in cost, payroll posting, the cash journal) or from an allocation timeline.
