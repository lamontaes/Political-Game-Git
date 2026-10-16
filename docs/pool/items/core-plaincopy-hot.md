---
id: core-plaincopy-hot
title: "plainCopy in module-data.ts is the hottest function in a played three years (about 5 percent)"
area: core
kind: cleanup
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** In a CPU profile of 1,100 played days (three years from the January 20, 2025 start) in a drawn place, New London, Minnesota (seed eb73b1694f87b8d8863f513b56b5674af2c3ecb178510fac5a1c7569b127075d), `plainCopy` in `src/core2/module-data.ts` was the single hottest function: 14.6 s of self time in a 284 s advance, about 5 percent. It is the play-mode copy that every module-table write makes: a recursive, frozen deep copy of the row. Make it cheaper without changing what engines see: for instance copy only the fields a write changed, or skip re-freezing values that are already frozen plain data.

**Rules.** Speed: no change may make a year slower, and the aim is a measured gain; never scan the world or a whole history daily. Rows must stay immutable records, because engines check that (the comment on `plainCopy` says so), so the fix keeps the same observable rows. Bookkeeping stays a debug switch: tests and the bench check values, play does not.

**Done when.** Before and after profiles of the same seed and place, on the same machine, one process at a time, show `plainCopy` self time falling by a stated amount, and the counted totals and every module table's rows are identical after the run, compared by record id. A unit test in a random place of the 56 shows a written row is still frozen and still equal in value to the input.

**Files.** src/core2/module-data.ts

**Notes.** Found 2026-10-16 while checking core-counted-flows-monthly-speed, which did not reproduce. The profile harness used: open the played world with `prepareWorld` from `scripts/core2-guard/month.mjs`, call `advanceCore` for N days under `node --cpu-prof`, and sum self time by function.
