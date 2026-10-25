---
id: tests-world-tests-outgrow-worker-heap
title: "Several world-building tests run their test worker out of the default 2 GB heap"
area: core
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** On a four-core cloud container with 16 GB, Node's default heap limit is 2,096 MB, and vitest's workers inherit it. Run there one file at a time on main 01f5cd4715, school-outcomes.test.ts and school-pay.test.ts fail every run with 'Worker exited unexpectedly' (V8: 'Ineffective mark-compacts near heap limit'), and press-turnover.test.ts's second case does the same. counted-weight-money.test.ts and press-money.test.ts did it once each on a large draw. With NODE_OPTIONS=--max-old-space-size=4096 all of them pass on the same main. Give the tests that build a played world the heap they need where vitest starts its workers, once, so a merger or CI on a 2 GB default sees the same result as a developer.

**Rules.** Never skip or quarantine a test to get green. One rule for all: the heap is set where the workers start, not test by test. Bookkeeping is a debug switch: tests keep running with the bookkeeping they set.

**Done when.** On a machine whose default Node heap is about 2 GB, school-outcomes, school-pay and press-turnover pass with the repo's own vitest command and no NODE_OPTIONS, shown in the PR body with the heap limit printed; the other unit tests are unaffected.

**Files.** vite.config.ts

**Notes.** Filed Oct 25 by the speed lead while running the school and press tests for core-speed-school-day-memo and core-speed-press-town-adults.
