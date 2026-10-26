---
id: tests-budget-sales-tax-zero-total
title: "Diagnose zero sales-tax receipts in the generated budget test"
area: gov
kind: bug
priority: 1
size: S
status: claimed
claimed-by: claude/budget-sales-tax-zero
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-26T17:55:40.000Z
---

**What.** The budget test for sales tax collected on town purchases fails on clean main and on PR 6067 in the same generated town. With GOLDEN_PATH_SEED b19affd9b3296e3f8fe097c100a3c28fe16ebc09, its Templeton, Indiana draw at suffix :0 reports expected zero to be greater than zero at src/core2/budgets.test.ts:325. The local seller check did not exempt the case. Merger 3 reproduced the identical failure on exact main parent 0695ed520103d0e86616500feeaf3b484b524848; its cause is not yet diagnosed.

**Rules.** Never loosen the test: trace real purchases and their tax payments independently before deciding whether the engine missed a collection or the fixture has no taxable purchase. One rule, all 56 places: preserve the random draw and use no place-specific engine logic.

**Done when.** The exact named seed reproduces on clean main, and the repaired test passes with an explained purchase and tax-journal trail or an independently proven absence of an eligible taxable purchase. Two fresh drawn places are named with their seeds and results, changed-file checks pass, and no missing payment is hidden by a predicate that only reads missing tax output.

**Files.** src/core2/budgets.test.ts, src/core2/modules/budgets.ts

**Notes.** Merger 3, October 26: baseline-budget.log and tests.log under /workspace/scratch/merger3-oct26-6067 retain the matching source-main and branch failure; this is separate from the bounded circle-retention repair.
