---
id: core-opening-award-level-rerate
title: "A Social Security cut or raise reaches the awards the opening wrote for full people"
area: core
kind: stopgap
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "split from gov-needs-opus-gov-124; stopgap SG-GOV-opening-award-level"
---

**What.** When the federal Social Security line is cut or raised, `applySocialSecurityLevel` (`budgets-treasury.ts`) re-amounts awards claimed in play and the counted retirees' pooled flows, but the retirement awards the opening wrote for full people keep their amount. `setStandingContractAmount` in `finance-state.ts` refuses a recipient-income contract, and the segregated retirement funding that pays it (`opening-income-funding.ts`) is built from the award's recorded monthly amount and checked against the contract. Let a recipient-income contract take a new amount from its next due date, change the funding term by the same total, and have `applySocialSecurityLevel` set both, keeping the recorded award fact as the base.

**Rules.** An effect is a read: the payment on the next due date reads the new level. Wire to the world: the check shrinks and the payer's funding falls by the same dollars on the journal. One model, two tiers. No dice. One rule, all 56 places.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place, seed named) a Social Security cut in a federal budget changes a named opening retiree's monthly check from the next due date (contract id and journal ids), the payer's funding falls by the same total, every dollar balances, and the stopgap row SG-GOV-opening-award-level is resolved. The owner plays it: cuts Social Security in a bill and watches a retiree's check shrink.

**Files.** src/core2/finance-state.ts, src/core2/opening-income-funding.ts, src/core2/budgets-treasury.ts, src/core2/data/stopgaps.json

**Notes.** Core area: finance-state.ts. Split out of gov-needs-opus-gov-124 after checking main on Oct 15.
