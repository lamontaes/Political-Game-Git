---
id: tests-term-start-history-worker-oom
title: "term-start-history.test.ts runs its worker out of memory on some drawn places (Millington, Tennessee, seed tsh22)"
area: release
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/core2/term-start-history.test.ts builds one bench world in a place drawn from the states with a governor clause, which since October 23 is all 56. With seed tsh22 it draws Millington, Tennessee (4749060), whose world holds about 1.8 GB of heap on main, and the vitest worker dies at its default 2 GB heap after about 190 seconds. The same draw passes with NODE_OPTIONS=--max-old-space-size=4096, so the dates are right and the failure is memory.

**Rules.** Never weaken a test to get green: the test keeps drawing from all 56 places; the fix is a measured heap or a lighter world build, with the place and seed named.

**Done when.** GOLDEN_PATH_SEED=tsh22 npx vitest run src/core2/term-start-history.test.ts passes at the heap the release workflow gives tests, and three further random draws pass; the PR names each place and seed and the measured heap of the buildBenchWorld call.

**Files.** src/core2/term-start-history.test.ts, vite.config.ts

**Notes.** Found Oct 23 by research-offices-sourced-parameters (branch claude/dreamy-tesla-bgi3ui-offices).
