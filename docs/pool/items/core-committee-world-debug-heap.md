---
id: core-committee-world-debug-heap
title: "The drawn two-year committee world exhausts memory before its assertions"
area: core
kind: bug
priority: 1
size: M
status: claimed
claimed-by: claude/committee-heap
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-25T08:33:33.800Z
---

**What.** Merger 1 reproduced an unexpected Vitest worker exit on clean main e269fd0acf3234a06a7ae06e31e9fe0f2cbde18f while collecting src/core2/legislature-committees.test.ts. GOLDEN_PATH_SEED=93678d3573d46855 draws Gastonia, North Carolina (3725580), attempt 0. With normal bookkeeping, one worker and NODE_OPTIONS=--max-old-space-size=5120 in the 8 GiB cloud container, collection ended after 1848.90 seconds, before any assertion. The cgroup oom_kill counter increased from 12 to 13 during this isolated main run. PR #5981 on the same input also exited before assertions at 1828.19 seconds in its isolated 5 GiB repeat; its earlier 4 GiB run hit the V8 heap limit. The producer fix in that PR passes its separate named regression and 35 producer tests.

**Rules.** Find and fix retained memory growth at its source. Keep the full 730-day generated world, bookkeeping validation, drawn-place coverage and all positive committee-trade and floor-vote assertions. Never clear this failure by disabling bookkeeping, weakening the assertions, selecting a convenient replacement seed or raising the container budget.

**Done when.** The unchanged committee test completes on the recorded input with one worker and a 5 GiB Node heap in the 8 GiB environment, all three assertions pass with positive trade and honored-floor-vote records, and a freshly drawn place completes with the same checks; the PR names the places, seeds, actual record IDs and measured before/after memory behavior.

**Files.** src/core2/legislature-committees.test.ts, src/core2/bookkeeping.ts, src/core2/state.ts

**Notes.** Found during Merger 1 review of #5981 on October 24, 2026. Main resource failure is separate from the undefined occupationClassification producer bug.
