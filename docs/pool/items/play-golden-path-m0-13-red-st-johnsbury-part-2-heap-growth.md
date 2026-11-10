---
id: play-golden-path-m0-13-red-st-johnsbury-part-2-heap-growth
title: "Monthly heap growth in the played world stays under the test's 5 MiB ceiling"
area: core
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after: play-golden-path-m0-13-red-st-johnsbury-part-1-rerun-and-split
blocked-on:
lead: play-first
model: opus
effort: high
root: rc2-done-from-records
source: split from play-golden-path-m0-13-red-st-johnsbury in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** In the played world of St. Johnsbury, Vermont, retained heap grew 110.5 MiB a month against the test's 5 MiB a month ceiling, which means something keeps every record it writes. A country's year has to run over hundreds of years (owner, Oct 29), so records and memory must hold flat: old records fold into summaries once play no longer reads them. This part finds what grows and folds it.

**Cause.** Needs cause. Looked at: measured: GOLDEN_PATH_SEED=f915eb032ec8974d29313800491a231f3b0daedc594075e0adbea9c7937ef8c4 GOLDEN_PATH_PLACE_KEY=5062125 node --max-old-space-size=8192 --expose-gc --import tsx tests/golden-path/played-world.node-test.ts in St. Johnsbury, Vermont (place key 5062125, seed f915eb032ec8974d29313800491a231f3b0daedc594075e0adbea9c7937ef8c4) failed on main 663a38fedf (Oct 28); the heap growth was 110.5 MiB a month; which table grows is not traced. Not yet known: which table grows. How to find it once part 1 has re-run the check: re-measure on current main (part 1 reports whether it still fails), then find which engine's table or index grows by month (a heap or per-module record count by month), and fold or index it so the monthly growth falls under the test's ceiling in three drawn places, proven with the speed-work skill's method (twin run with the records proof showing nothing a reader needs was dropped).

**Fix.** None until the cause is found.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: every check M0-13 makes must hold in every drawn place's played year, so the failure is fixed at its engine, never by loosening the check. One rule, all 56 places: the repro place is a repro, not a rule; no place is named in logic. Red main comes first (owner, Oct 15). Ask why: the PR names the cause by file and line.

**Done when.** A second session runs the M0-13 command above (and two more drawn places, names and seeds recorded) and sees the heap-growth check pass, with the table that grew named and the records proof showing no reader lost a record it needed.

**Waits on.** play-golden-path-m0-13-red-st-johnsbury-part-1-rerun-and-split, which re-runs the check on current main and may narrow or drop this part.

**Files.** tests/golden-path/played-world.node-test.ts, src/core2/life.ts, src/core2/state.ts
