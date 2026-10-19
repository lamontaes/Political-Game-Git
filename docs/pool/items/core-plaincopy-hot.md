---
id: core-plaincopy-hot
title: "plainCopy in module-data.ts is the hottest function in a played three years (about 5 percent)"
area: core
kind: cleanup
priority: 3
size: S
status: done
claimed-by:
pr: #4748
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** In a CPU profile of 1,100 played days (three years from the January 20, 2025 start) in a drawn place, New London, Minnesota (seed eb73b1694f87b8d8863f513b56b5674af2c3ecb178510fac5a1c7569b127075d), `plainCopy` in `src/core2/module-data.ts` was the single hottest function: 14.6 s of self time in a 284 s advance, about 5 percent. It is the play-mode copy that every module-table write makes: a recursive, frozen deep copy of the row. Make it cheaper without changing what engines see: for instance copy only the fields a write changed, or skip re-freezing values that are already frozen plain data.

**Rules.** Speed: no change may make a year slower, and the aim is a measured gain; never scan the world or a whole history daily. Rows must stay immutable records, because engines check that (the comment on `plainCopy` says so), so the fix keeps the same observable rows. Bookkeeping stays a debug switch: tests and the bench check values, play does not.

**Done when.** Before and after profiles of the same seed and place, on the same machine, one process at a time, show `plainCopy` self time falling by a stated amount, and the counted totals and every module table's rows are identical after the run, compared by record id. A unit test in a random place of the 56 shows a written row is still frozen and still equal in value to the input.

**Files.** src/core2/module-data.ts

**Notes.** Found 2026-10-16 while checking core-counted-flows-monthly-speed, which did not reproduce. The profile harness used: open the played world with `prepareWorld` from `scripts/core2-guard/month.mjs`, call `advanceCore` for N days under `node --cpu-prof`, and sum self time by function.

Tried 2026-10-16, did not work: remembering every copy `plainCopy` builds in a `WeakSet` and sharing it when a row is written again made the function slower, not faster. Same seed and place (New London, Minnesota, seed eb73b169...075d), 400 played days, CPU profile on main and on the branch: `plainCopy` self time 1.9 s on main and 6.7 s with the WeakSet (non-idle total 92.2 s against 93.8 s). Rows are mostly shallow, so sharing rarely saves a copy, and the WeakSet lookup and insert on every object costs more than the copy. Also, `plainCopy` is only about 2 percent at 400 days; the 5 percent figure is at 1,100 days. A fix has to avoid per-object bookkeeping, for example not copying a row whose caller will not touch it, which needs a rule for who owns the object. Worth doing only if a profile at three years still shows it. Branch was not pushed.

Sent back 2026-10-16 from PR #4748 (branch claude/plaincopy-literal): GitHub refuses to merge a draft pull request (HTTP 405: "Pull Request is still a draft"). The merger skill's prescribed REST ready-for-review endpoint returns HTTP 404. Mark this PR ready for review, retain the named changed-file checks at the top, and push any needed corrections; finish on that branch, merge main into it first.
