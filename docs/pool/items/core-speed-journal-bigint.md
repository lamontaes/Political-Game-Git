---
id: core-speed-journal-bigint
title: "The cash journal adds plain safe integers, not BigInt, while the sum stays below 2^53 - 1"
area: core
kind: cleanup
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** In src/core2/journal-state.ts, plusTotals, volumes and the outside-flow totals add values with BigInt(a) + BigInt(b), then convert back with Number(sum). In a normal game year no place's journal total approaches 2^53 - 1 minor units ($90,071,992,547,409.91), so the BigInt conversion allocates object memory every day without buying exactness that plain JavaScript integer addition lacks. Replace with plain integer addition and refuse a total that would exceed Number.MAX_SAFE_INTEGER, so the speed gain is safe.

**Rules.** Wire to the world: every dollar balancing is preserved, and the books balance down to the cent as before. Research before building: measure the speed of a game year on seed m7a before and after, on the same machine, one process at a time, and report the difference in the PR body. No dice.

**Done when.** A game year on seed m7a runs with the BigInt allocations gone from journal-state.ts, src/core2/journal*.test.ts and accounts.test.ts pass, and a test asserts that a minor unit sum approaching MAX_SAFE_INTEGER throws rather than losing precision.

**Files.** src/core2/journal-state.ts, src/core2/journal-state.test.ts

**Notes.** Sized S because it touches three functions in one file. A typical day runs several hundred ledger entries; removing the BigInt wrappers stops hundreds of short-lived heap allocations per day.

Tried Oct 20 (claude, branch claude/speed-journal-bigint, not proposed for merge): plusTotals, volumes and the outside-flow totals in `journal-state.ts` rewritten to add plain safe integers and refuse a sum that is not a safe integer (same exactness guarantee, no BigInt). The journal, accounts and finance tests passed (16 files, 568 tests). Same-session timing on seed m7a, two runs each, one process at a time: branch 36.2 s and 36.8 s, main 35.7 s and 35.9 s. No gain, so it should not merge. The allocation profile (23 GB) charged these functions about 770 MB, but V8 reclaims short-lived BigInts cheaply and the year did not move, so the journal's cost is not in its number type. Next look: the per-posting receipt objects and `sourceRef` copies in `postCashJournal` (1.1 GB) and the account snapshot maps built by `portfolios` (0.4 GB), measured by an A/B run like this one before any PR.

Profiled Oct 20 (claude/political-game-pool-8defjq): a CPU profile (`node --cpu-prof`, `npm run speed:year -- --seed m7a`, Discovery Harbour, Hawaii, 4-core container, year 1 in 45.6 s, 62.9 s of samples) puts all of `journal-state.ts` at 3.15 s of self time, 5 percent, with `postCashJournal` 1.32 s, `portfolios` 0.51 s and `projectCashJournal` (journal.ts) 0.89 s. So even removing every BigInt and receipt copy could save about 2 percent of a year, well inside run-to-run noise, which matches the earlier A/B (36.2 s against 35.7 s). The allocation profile misled: it counts bytes, and V8 reclaims short-lived BigInts cheaply. The journal is not where the year goes. The largest self times are the garbage collector (16.5 percent), `monthBoundary` in work-pay-period.ts (1.64 s, 2.6 percent), `releaseResidentHousehold` (1.00 s), `makeIsoDate` (0.90 s) and `epochDayOf` (0.41 s) in kernel/dates.ts, `onHoliday` in school.ts (0.64 s) and `recordWorkAttendance` (0.53 s). Recommend the CTO drops this item and that the dense-town speed item (core-speed-year-over-limit-dense-town) starts from those functions.

Oct 20 (claude/political-game-pool-b6g0dl): built the same change a second time without knowing branch claude/speed-journal-bigint already held it (commit 26f4a391d), and dropped mine. Its measurement, for the PR that branch opens: seed m7a (Discovery Harbour, Hawaii), allocated bytes over a played year 17,133 MB before, 16,681 MB after (-452 MB, -2.6 percent); plusTotals 331 MB to 100 MB; volumes 438 MB to below the top-40 list; src/core2/journal*.test.ts and accounts.test.ts 104 of 104 passing with `exactSum` (two safe integers add exactly while the sum stays safe, and a sum past the safe range cannot round back into it).
