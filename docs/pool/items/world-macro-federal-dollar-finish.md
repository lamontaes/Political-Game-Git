---
id: world-macro-federal-dollar-finish
title: "Finish the federal-dollar trial PR: parameter read, estimate tag, merge conflicts"
area: world
kind: cleanup
priority: 2
size: M
status: claimed
claimed-by: trial/glm/federal-dollar
pr: #4990
after:
blocked-on:
source: "trial PR #4990 (branch trial/glm/federal-dollar); owner Oct 19: put it back in the pool"
claimed-at: 2026-10-20T18:26:28.488Z
---

**What.** Finish PR #4990 on its branch. The multiplier and the impulse path are already removed and the chain is proven (budget line, payee, spending, output). Two fixes remain from the acting CTO's send-back: read `macroTownIncomeHistoryMonths` through `api.parameter` instead of a direct import, and retag the stopgap ESTIMATED with a spread, keeping SG-WORLD-macro-income-history registered as an estimate, or else generate the pre-start months from the opening economy's own pay terms so no estimate is needed. The merger's conflicts in `scripts/world-proofs/world-economy-year.ts` and `src/core2/data/macro/` are resolved by merging main in first and regenerating, never hand-resolving generated files.

**Rules.** Replace, never layer: the multiplier stays gone and the PR body counts what was removed, nothing is added beside the old path. An effect is a read: output moves only through dollars the treasury paid in town, read by the engines that already pay and spend.

**Done when.** As the trial order's done-when: the chain by record id in a drawn place with `buildBenchWorld` (budget line to payee record to spending to output), `grep macroFiscalMultiplier src/` empty, the macro, budgets and jobs tests green, and the calibration report prints its band check; the branch merges main cleanly and the test in tests/golden-path/federal-dollar.node-test.ts names the place and seed. The owner plays it: a bigger federal line shows up as people paid in town and the economy follows them.

**Files.** src/core2/modules/macro.ts, src/core2/macro-model.ts, src/core2/modules/residents.ts, src/core2/data/macro/parameters.json, tests/golden-path/federal-dollar.node-test.ts

**Notes.** Branch trial/glm/federal-dollar; finish there, merge main in first. The trial order is PR #4810 (left open as the reading order). Graded about 4.1 of 5 by the acting CTO, Oct 18. Follow-up item world-macro-outside-outlays-indexed after it.

Sent back 2026-10-20 from PR #4990 (branch trial/glm/federal-dollar): owner and date notes in code and data: '(owner, Oct 16: ...)' in src/core2/macro-model.ts and '(owner, Oct 16)' in the macroFederalOutlayResponseBand citation in src/core2/data/macro/parameters.json; finish on that branch, merge main into it first.
