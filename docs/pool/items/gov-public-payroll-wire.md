---
id: gov-public-payroll-wire
title: "Public pay comes from the treasury"
area: gov
kind: wiring
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: "core-needs-core-172 triage, Oct 15"
---

**What.** The core's `api.fundPublicPay` is built (state.ts) and tested, but nothing calls it: the budgets treasuries never fund public payroll, so public wages come from an outside pay authority (`SG-GOV-appointee-pay`). Call it from the budgets treasuries. The shortfall, when the treasury cannot cover payroll, must be a record the budget reads. Today the budgets file carries a comment saying the link waits for the core, which now has it.

**Rules.** Wire to the world: the wage paid from the treasury must change a household's cash and the treasury's balance. Every dollar balances on the journal.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place from all 56) a public employee's wage is paid from a government-treasury account by journal record id, the shortfall record is read by the budget, and the stopgap is resolved.

**Files.** src/core2/modules/budgets.ts, src/core2/state.ts

**Notes.** core.md line 211, checked Oct 15.
