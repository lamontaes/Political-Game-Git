---
id: core-committee-world-debug-heap
title: "The drawn two-year committee world exhausts memory before its assertions"
area: core
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr: #8402
after:
blocked-on:
source: added with npm run pool -- add
claimed-at:
lead: memory
standard: 2
model: haiku
effort: low
root: rc5-full-detail-every-day
checked: fable 2026-11-10
branch: claude/pool-core-committee-world-debug-heap
---

**What.** Merger 1 reproduced an unexpected Vitest worker exit on clean main e269fd0acf3234a06a7ae06e31e9fe0f2cbde18f while collecting src/core2/legislature-committees.test.ts. GOLDEN_PATH_SEED=93678d3573d46855 draws Gastonia, North Carolina (3725580), attempt 0. With normal bookkeeping, one worker and NODE_OPTIONS=--max-old-space-size=5120 in the 8 GiB cloud container, collection ended after 1848.90 seconds, before any assertion. The cgroup oom_kill counter increased from 12 to 13 during this isolated main run. PR #5981 on the same input also exited before assertions at 1828.19 seconds in its isolated 5 GiB repeat; its earlier 4 GiB run hit the V8 heap limit. The producer fix in that PR passes its separate named regression and 35 producer tests.

**Cause.** Measured: does not reproduce on main. At the recorded place (Gastonia, North Carolina, `GOLDEN_PATH_SEED=93678d3573d46855`), the unchanged test with one worker and a 5 GiB heap passed 3/3 in 1,070.6 s, highest sampled memory 4,434 MB (opus-5251, main e9d07eaf39, PR #8402). On a fresh draw (Page, Arizona, 0451810, `GOLDEN_PATH_SEED=570c202317fe0dd1`, main da6d37b5, Nov 11), `npx vitest run src/core2/legislature-committees.test.ts --maxWorkers=1` with `NODE_OPTIONS=--max-old-space-size=5120` passed 3/3 in 922 s. Which change since the October failure (collection ended at 1,848 s before any assertion, main e269fd0acf) removed it is not traced; core-memory-circle-retention-leaks, split from this item, is done (PR #6067), and the speed lead's folds landed since.

**Fix.** Nothing to build. Proposed for the CTO: close this item as no longer reproducing on main, with the two runs above. The earlier fix idea (one shared copy of an event's facts instead of one per witness) is kept in the Notes for the speed lead if the world grows again.

**Time box.** 1 hour for one Haiku session, only to close the item once the CTO agrees. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Find and fix retained memory growth at its source. Keep the full 730-day generated world, bookkeeping validation, drawn-place coverage and all positive committee-trade and floor-vote assertions. Never clear this failure by disabling bookkeeping, weakening the assertions, selecting a convenient replacement seed or raising the container budget. One rule, all 56 places: the unchanged test passes on the recorded place and on a freshly drawn place, each named with its seed. Speed: the fix may not make a played year more than 20 percent slower, and it acts on the day something changed instead of scanning the world or its history every day.

**Done when.** A second session runs the unchanged src/core2/legislature-committees.test.ts on the recorded place (Gastonia, North Carolina, seed 93678d3573d46855) with one worker and a 5 GiB Node heap in the 8 GiB environment and sees all three assertions pass with positive trade and honored-floor-vote records. A freshly drawn place completes with the same checks, and the PR names both places, seeds, record ids and the measured memory before and after.

**Waits on.** Nothing.

**Files.** src/core2/legislature-committees.test.ts, src/core2/bookkeeping.ts, src/core2/state.ts

**Notes.** Found during Merger 1 review of #5981 on October 24, 2026. Main resource failure is separate from the undefined occupationClassification producer bug.

Split Oct 25: the three retention leaks found while measuring this world are `core-memory-circle-retention-leaks`. With them the Gastonia world's heap at day 660 (November 11, 2026) falls from 4,169 MB to 3,489 MB, and the unchanged test runs to 5,754 seconds instead of 4,492, but it still runs out of its 5 GiB heap (4,772 MB live after the last full collection). What remains is the fall 2026 election: the player's circle grows to 358 people, each focused person weighs up to 55 drive responses a day, and every witnessed event copies its facts into each witness's knowledge (1.6 million of 2.2 million known facts belong to focused people at day 660). Under the Oct 12 memory ruling ("summarize or drop old detail"), the next cuts are one shared copy of an event's facts instead of one per witness, and old focus that the player no longer deals with leaving the circle.

**Notes (Fable's check, Nov 10).** The measurement in Cause was taken on main at e269fd0acf. Whoever builds this reruns it on current main first and stops if the test now finishes.

Claimed by next for opus-5251 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 00:53 UTC) on branch claude/pool-core-committee-world-debug-heap.

Released (2026-11-11): Does not reproduce on main e9d07eaf39: the unchanged test passes 3/3 in 1,071 s with a 5 GiB heap (PR #8402). Continue on branch claude/pool-core-committee-world-debug-heap and pull request #8402.

Nov 11 (CTO): the Fix above is set to the standard text because the Cause now reads "Needs cause." The fix written before the cause stopped reproducing, kept for whoever finds the new cause: Store one shared copy of an event's facts instead of one per witness, and let old focus that the player no longer deals with leave the circle. Keep the test, its bookkeeping and its assertions unchanged.

Cause finder (Nov 11, 2026, for Fable B): one fresh draw run on main da6d37b5, Page, Arizona (0451810, seed 570c202317fe0dd1): the unchanged test passed 3/3 in 922 s at a 5 GiB heap, alone on a 16 GB container. With opus-5251's Gastonia run, it does not reproduce at the recorded place or on a fresh draw. Proposed: close.
