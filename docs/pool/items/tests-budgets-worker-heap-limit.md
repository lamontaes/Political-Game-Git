---
id: tests-budgets-worker-heap-limit
title: "budgets.test.ts runs out of its worker's 2 GB heap in some runs of the budgets files at two workers"
area: gov
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: found while closing tests-budgets-public-pay-intermittent, Oct 25
claimed-at:
---

**What.** In ten runs of the six budgets and withholding test files at two workers on main fd7482d81b (GOLDEN_PATH_SEED=109a7b3b1d5c1715d738e7b8ca9deec614910239), src/core2/budgets.test.ts failed in runs 4 and 6 and passed in the other eight. Each time its worker reached V8's heap limit near 2 GB ("Ineffective mark-compacts near heap limit", at 2,001.6 MB) and vitest reported the worker exited, losing two of its three tests. The machine had about 9 GB free, so the limit is the worker's own heap, and with one seed the world is the same each run: the file's peak sits at the limit, and garbage collection timing decides which side it lands on. An earlier ten-run loop failed the same way in two runs.

**Rules.** Never weaken a test: no case is dropped, skipped or shortened to fit. Speed: never hold the whole history in memory when a test needs only what it checks; release worlds a test is done with.

**Done when.** budgets.test.ts passes in ten runs in a row of the same six files at two workers on the seed above, with its peak heap measured before and after and named in the PR body, and a drawn place also passes with its seed named.

**Files.** src/core2/budgets.test.ts

**Notes.** Run logs: the six files are budgets-public-pay, budgets-treasury-reserve, budgets, withholding-outside-governments, tax-withholding and official-pay-withholding. budgets-public-pay.test.ts passed in all ten.
