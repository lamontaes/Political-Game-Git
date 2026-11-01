---
id: core-committee-world-debug-heap
title: "The drawn two-year committee world exhausts memory before its assertions"
area: core
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** Merger 1 reproduced an unexpected Vitest worker exit on clean main e269fd0acf3234a06a7ae06e31e9fe0f2cbde18f while collecting src/core2/legislature-committees.test.ts. GOLDEN_PATH_SEED=93678d3573d46855 draws Gastonia, North Carolina (3725580), attempt 0. With normal bookkeeping, one worker and NODE_OPTIONS=--max-old-space-size=5120 in the 8 GiB cloud container, collection ended after 1848.90 seconds, before any assertion. The cgroup oom_kill counter increased from 12 to 13 during this isolated main run. PR #5981 on the same input also exited before assertions at 1828.19 seconds in its isolated 5 GiB repeat; its earlier 4 GiB run hit the V8 heap limit. The producer fix in that PR passes its separate named regression and 35 producer tests.

**Rules.** Find and fix retained memory growth at its source. Keep the full 730-day generated world, bookkeeping validation, drawn-place coverage and all positive committee-trade and floor-vote assertions. Never clear this failure by disabling bookkeeping, weakening the assertions, selecting a convenient replacement seed or raising the container budget. One rule, all 56 places: the unchanged test passes on the recorded place and on a freshly drawn place, each named with its seed. Speed: the fix may not make a played year more than 20 percent slower, and it acts on the day something changed instead of scanning the world or its history every day.

**Done when.** The unchanged committee test completes on the recorded input with one worker and a 5 GiB Node heap in the 8 GiB environment, all three assertions pass with positive trade and honored-floor-vote records, and a freshly drawn place completes with the same checks; the PR names the places, seeds, actual record IDs and measured before/after memory behavior. **On screen.** None by design: this is a check, a speed or tooling change, or a cleanup; the player notices only that the game keeps running and the numbers stay believable.

**Files.** src/core2/legislature-committees.test.ts, src/core2/bookkeeping.ts, src/core2/state.ts

**Notes.** Found during Merger 1 review of #5981 on October 24, 2026. Main resource failure is separate from the undefined occupationClassification producer bug.

Split Oct 25: the three retention leaks found while measuring this world are `core-memory-circle-retention-leaks`. With them the Gastonia world's heap at day 660 (November 11, 2026) falls from 4,169 MB to 3,489 MB, and the unchanged test runs to 5,754 seconds instead of 4,492, but it still runs out of its 5 GiB heap (4,772 MB live after the last full collection). What remains is the fall 2026 election: the player's circle grows to 358 people, each focused person weighs up to 55 drive responses a day, and every witnessed event copies its facts into each witness's knowledge (1.6 million of 2.2 million known facts belong to focused people at day 660). Under the Oct 12 memory ruling ("summarize or drop old detail"), the next cuts are one shared copy of an event's facts instead of one per witness, and old focus that the player no longer deals with leaving the circle.
