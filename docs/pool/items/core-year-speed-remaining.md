---
id: core-year-speed-remaining
title: "A town year is still over 120 seconds after the monthly price fix (about 153 s in Garden City, Idaho and Exeter, New Hampshire on a 4-core cloud container)"
area: core
kind: bug
priority: 1
status: claimed
claimed-by: claude/political-game-pool-g2977r
pr:
blocked-on:
milestone:
source: "found by the session that took core-year-over-120s"
claimed-at: 2026-10-15T21:05:56.066Z
---

**What.** After the monthly price settlement was grouped (one payment per counted group instead of one per counted household), the played-world year in Garden City (key 1629620, seed speed-gc-1) measured 193.6 → 153.3 s and Exeter (key 3325300, seed speed-ex-1) 210.4 → 153.6 s, same cash and gross debit. The rest is spread out: garbage collection about 21% of a month, cash journal posting about 13% (`postCashJournal`, `projectCashJournal`, `copyProjection`), then payroll, campaign statements, press week, housing review, and the heap grows from about 700 MB to 2.6 GB across the year. Profile again, take the next measured hot path, and find what the heap keeps.

**Rules.** Speed: never scan the whole world or a whole history every day; act on the day something changed. Measure before and after on the same base, one process at a time. Bookkeeping is a debug switch: copying and freezing in `postCashJournal` should not run in play.

**Done when.** Both places under 120 s, one process at a time, on the machine the speed guard uses, with identical cash and gross debit to base.

**Files.** src/core2/journal-state.ts, src/core2/journal.ts, src/core2/modules/ (campaigns, press, housing), src/core2/counted-money.ts

**Notes.** Method: a scratch script around `buildBenchWorld` (two-level, `placeKey`), `advanceCore` per day, a CPU profile over 30 days in October. The hot path fixed first was `month` in `src/core2/modules/place-prices.ts`.
