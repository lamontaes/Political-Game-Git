---
id: core-business-compliance-twin-deleted
title: "The second monthly compliance payment and three law wrappers nobody calls are deleted beside the business module's own"
area: core
kind: cleanup
priority: 2
size: S
status: done
claimed-by: claude/dup-compliance-payment
pr: #6466
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T01:11:41.340Z
---

**What.** business-operating-rules.ts carried payOperatingCosts, a monthly compliance payment with the same transfer id as the business module's live payCompliance, and business.ts exported three wrappers (setBusinessOperatingLimit, addBusinessComplianceCost, endBusinessOperatingRule) that write the same rules the module already writes from the law. Nothing calls any of the four (duplicates report row C11).

**Rules.** Replace, never layer: one engine pays a business's compliance cost, so the second payer and the unused entry points go in one change, and the live payment keeps its law-applied record and its compliance row.

**Done when.** In a played world (buildBenchWorld) in a place drawn from all 56, a year of clean air or groundwater rules is paid through payCompliance with compliance rows named by record id, the clean air law tests pass, and grep finds no payOperatingCosts or the three wrappers.

**Files.** src/core2/business-operating-rules.ts, src/core2/modules/business.ts

**Notes.** TODO
