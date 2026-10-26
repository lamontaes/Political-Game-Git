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


Merger 1, Oct 26 03:16 UTC, independently reproduced while gating #6041: `src/bench/election-results.test.ts` also exhausts a 4096 MB worker heap on BOTH clean integrated main `102d8089d38c1f253d72d3cb5a09f10cff39fb0e` and PR head `a880bd0610436cf0af41d1abdd1cb4fa628dcd69`. Command: `OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" NODE_OPTIONS=--max-old-space-size=4096 GOLDEN_PATH_SEED=7b15c564537031c5 npx vitest run src/bench/election-results.test.ts src/bench/results.test.ts --dir src --maxWorkers 1`. The failing file draws Pittsford, Vermont (5055525), world seed `8d22fe6b94b3f49c0d21770e6888787d01d210cba257a101b3b92da8d1a671bf`; V8 reports ineffective mark-compacts / heap out of memory and worker exited unexpectedly. Both complete runs report one passed test/file (the candidate-name test, Lance Creek, Wyoming, world seed `8d1ff2cf28218b1a809e747589345a62bcd5a5628bf6fa6d568bc9a507320dac`) and one worker error; PR total788.44s, clean-main777.01s. Do not reduce coverage, narrow draws, skip the election, or call the error a pass. The existing 2 GB item now has a concrete 4 GB failure to diagnose; all 19 journal/government tests and a separate ordinary Mansfield Center election-to-readers chain pass. PR review: https://github.com/lamontaes/Political-Game-Git/pull/6041#issuecomment-6407413997 .
