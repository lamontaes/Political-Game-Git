---
id: core-speed-counted-payroll-into-named-ledger-part-2-employer-calendar-settlement
title: "Counted settlement and withholding post through the one record on the employer's calendar"
area: core
kind: cleanup
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after: core-speed-counted-payroll-into-named-ledger-part-1-group-record-shape
blocked-on:
lead: money
model: opus
effort: high
root: design-one-model-two-tiers
source: split from core-speed-counted-payroll-into-named-ledger in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** Counted employers' wages are settled by `payGroups` (src/core2/counted-money.ts) with their own withholding (`withholdingFor`) and employer share (`payEmployerShare`). Move that settlement onto the group record of part 1, on the employer's own payday, so withholding and the employer tax post through the one ledger. This is part 2 of core-speed-counted-payroll-into-named-ledger. Feeds: core-speed-counted-payroll-into-named-ledger

**Cause.** Design: docs/coordination/OWNER-DECISIONS.md, Nov 8 night Coordinator call "Counted payroll: the same rule, times the count, on the employer's own calendar." `payGroups` in src/core2/counted-money.ts (line 584) settles counted wages and withholding outside the named ledger.

**Fix.** Route `payGroups` settlement, withholding and the employer share through the group record, keeping each payday and amount the same.

**Time box.** 4 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One model, two tiers: a counted group is paid by the same rule as a named worker, times its count, with no pseudo-person per group. Speed: a year stays within 20 percent of its base. Replace, never layer: no second path is left beside the one ledger shape.

**Done when.** A second session, not the builder, plays a one-year buildBenchWorld in a drawn place (place and seed named) and the year's counted payroll totals, withholding and employer tax are the same as before the change, now posted through the group record, by ledger record id.

**Waits on.** core-speed-counted-payroll-into-named-ledger-part-1-group-record-shape.

**Files.** src/core2/counted-money.ts, src/core2/work-payroll-cash.ts, src/core2/modules/residents.ts, src/core2/modules/employer-taxes.ts, src/core2/tax-withholding.ts
