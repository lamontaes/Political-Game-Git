---
id: tests-world-tests-outgrow-worker-heap
title: "Several world-building tests run their test worker out of the default 2 GB heap"
area: core
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** On a four-core cloud container with 16 GB, Node's default heap limit is 2,096 MB, and vitest's workers inherit it. Run there one file at a time on main 01f5cd4715, school-outcomes.test.ts and school-pay.test.ts fail every run with 'Worker exited unexpectedly' (V8: 'Ineffective mark-compacts near heap limit'), and press-turnover.test.ts's second case does the same. counted-weight-money.test.ts and press-money.test.ts did it once each on a large draw. With NODE_OPTIONS=--max-old-space-size=4096 all of them pass on the same main. Give the tests that build a played world the heap they need where vitest starts its workers, once, so a merger or CI on a 2 GB default sees the same result as a developer. Combined by the Oct 25 audit, one change in one seam; the parts folded in: tests-budgets-worker-heap-limit (budgets.test.ts runs out of its worker's 2 GB heap in some runs of the budgets files at two workers); tests-term-start-history-worker-oom (term-start-history.test.ts runs its worker out of memory on some drawn places (Millington, Tennessee, seed tsh22)). Each part's own done-when line is listed in Notes and is part of this item's acceptance.

**Rules.** Bookkeeping is a debug switch: the tests keep the bookkeeping they set, and only the workers' heap changes. One rule, all 56 places: the tests keep drawing their towns from all 56, the largest included, never a smaller pinned town to fit the heap. Never skip or quarantine a test to get green.

**Done when.** On a machine whose default Node heap is about 2 GB, school-outcomes, school-pay and press-turnover pass with the repo's own vitest command and no NODE_OPTIONS, shown in the PR body with the heap limit printed; the other unit tests are unaffected. **On screen.** None by design: this is a check, a speed or tooling change, or a cleanup; the player notices only that the game keeps running and the numbers stay believable.

**Files.** vite.config.ts, src/core2/school-outcomes.test.ts, src/core2/school-pay.test.ts, src/core2/press-turnover.test.ts, src/core2/budgets.test.ts, src/core2/term-start-history.test.ts

**Notes.** Filed Oct 25 by the speed lead while running the school and press tests for core-speed-school-day-memo and core-speed-press-town-adults.

Folded in Oct 25 from tests-budgets-worker-heap-limit. Its done when: budgets.test.ts passes in ten runs in a row of the same six files at two workers on the seed above, with its peak heap measured before and after and named in the PR body, and a drawn place also passes with its seed named.

Folded in Oct 25 from tests-term-start-history-worker-oom. Its done when: GOLDEN_PATH_SEED=tsh22 npx vitest run src/core2/term-start-history.test.ts passes at the heap the release workflow gives tests, and three further random draws pass; the PR names each place and seed and the measured heap of the buildBenchWorld call.
