---
id: tests-finance-sales-receipt-own-illness-provider
title: "Two receipt-linked finance tests lack the work.own-illness provider on main"
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

**What.** Two finance-sales-receipt-writer.test.ts cases fail on clean main c3c03bc19a with Unregistered reason provider: work.own-illness. Their minimal fixtures schedule owned work through runScheduledWork and chooseAct without installing that required provider. The exception prevents the intended positive pending-allowance and exhausted-cash closure assertions from running, independently of the journal optimization in PR 5907.

**Rules.** Wire to the world: install the providers required by the actual work-admission path in the fixture. Replace, never layer: preserve the existing closure and finite-cash assertions, never default a missing provider to zero or skip the cases.

**Done when.** All 15 cases in src/core2/finance-sales-receipt-writer.test.ts pass, including the ended-route positive pending allowance and genuinely unfunded owned-job receipt cases; the work-admission path reaches its closure evidence and finite-cash assertions rather than throwing for a missing provider. Run the changed-file gate and report the exact test command and result.

**Files.** src/core2/finance-sales-receipt-writer.test.ts, src/core2/modules/work.ts, src/core2/choice.ts

**Notes.** Merger 3 reproduced both cases on checked PR 5907 head 5f0ed17187 and clean main c3c03bc19a with GOLDEN_PATH_SEED=c79c39c75d74bbb891f40bbeffc197dd; isolated baseline: 13 pass, 2 fail in 8.11s. #5829/core-finance-writer-own-illness-provider-red fixed finance-writer-contract.test.ts, not this receipt fixture.
