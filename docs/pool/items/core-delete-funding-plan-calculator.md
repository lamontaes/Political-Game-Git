---
id: core-delete-funding-plan-calculator
title: "Delete the unused business funding-plan calculator while preserving the live repayment policy"
area: core
kind: cleanup
priority: 2
size: S
status: open
claimed-by: claude/stopgap-finance-policy
pr:
blocked-on:
source: split from core-stopgap-parameters-authored-finance-policy for PR #5375
---

**What.** The pure planBusinessFunding calculator and its FundingPlanInput type have no callers outside their own tests. Remove that unused path, its four private reason entries and the tests that exercise only the deleted calculator. Preserve estimateCreditLimit, the market-projection checks and the live businessRepaymentShare rule in finishFinanceDay; this cleanup does not claim to replace that repayment policy.

**Rules.** Replace, never layer: remove the unused path completely and keep every live caller and parameter. An effect is a read: this cleanup claims no new runtime feature, and the parent retains the requirement for a replacement read in a played world.

**Done when.** Repository searches of src, data, tests and scripts find no remaining references to planBusinessFunding, FundingPlanInput or the four removed reason ids. business-books.test.ts, finance-writer-contract.test.ts and tooling/tripwires.test.ts pass. finishFinanceDay still reads businessRepaymentShare through the existing policy key, estimateCreditLimit remains tested, and SG-P8-business-books-credit-policy stays registered and open for the live repayment policy.

**Files.** src/core2/business-books.ts, src/core2/business-books.test.ts, src/core2/data/business-books.json, src/core2/data/stopgaps.json

**Notes.** The parent item and its one-year acceptance remain intact. This bounded item tracks only the unused-code cleanup already implemented in PR #5375.
