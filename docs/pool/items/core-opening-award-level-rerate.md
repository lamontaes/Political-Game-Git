---
id: core-opening-award-level-rerate
title: "A Social Security cut or raise reaches the awards the opening wrote for full people"
area: core
kind: stopgap
priority: 2
size: M
status: done
claimed-by:
pr: #4661
blocked-on:
milestone:
source: "split from gov-needs-opus-gov-124; stopgap SG-GOV-opening-award-level"
claimed-at:
---

**What.** When the federal Social Security line is cut or raised, `applySocialSecurityLevel` (`budgets-treasury.ts`) re-amounts awards claimed in play and the counted retirees' pooled flows, but the retirement awards the opening wrote for full people keep their amount. `setStandingContractAmount` in `finance-state.ts` refuses a recipient-income contract, and the segregated retirement funding that pays it (`opening-income-funding.ts`) is built from the award's recorded monthly amount and checked against the contract. Let a recipient-income contract take a new amount from its next due date, change the funding term by the same total, and have `applySocialSecurityLevel` set both. A change of amount alone would fail the settlement check: `incomeAward` in `finance-cash.ts` throws "Current income obligation contradicts its actual award" unless the contract's amount equals the saved award fact's `monthlyMinor`, and the funding contract's `incomeContractIds` check sums the children. So the change needs a dated award-adjustment fact (a benefit level effective on a date, citing the measure) that `incomeAward` and the opening funding check read as the current award, plus the same change in `setStandingContractAmount`'s refusal and the saved-trace shape.

**Rules.** An effect is a read: the payment on the next due date reads the new level. Wire to the world: the check shrinks and the payer's funding falls by the same dollars on the journal. One model, two tiers. No dice. One rule, all 56 places.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place, seed named) a Social Security cut in a federal budget changes a named opening retiree's monthly check from the next due date (contract id and journal ids), the payer's funding falls by the same total, every dollar balances, and the stopgap row SG-GOV-opening-award-level is resolved. The owner plays it: cuts Social Security in a bill and watches a retiree's check shrink.

**Files.** src/core2/finance-state.ts, src/core2/opening-income-funding.ts, src/core2/budgets-treasury.ts, src/core2/data/stopgaps.json

**Notes.** Core area: finance-state.ts. Split out of gov-needs-opus-gov-124 after checking main on Oct 15.

Sent back 2026-10-16 from PR #4661 (branch claude/core-opening-award-rerate): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.
