---
id: core-speed-counted-payroll-into-named-ledger-part-3-arrears-per-group
title: "A counted group in arrears keeps its arrears in the one ledger and pays them when cash returns"
area: core
kind: cleanup
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after: core-speed-counted-payroll-into-named-ledger-part-2-employer-calendar-settlement
blocked-on:
lead: money
model: opus
effort: high
root: design-one-model-two-tiers
source: split from core-speed-counted-payroll-into-named-ledger in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** Counted groups keep per-group arrears outside the named ledger (`rt.arrears` and the `carry` book in `payGroups`, src/core2/counted-money.ts around line 762). Keep them on the group record, so a group in arrears is carried and paid when the employer's cash returns, the way a named worker's unpaid wages are. This is part 3 of core-speed-counted-payroll-into-named-ledger. Feeds: core-speed-counted-payroll-into-named-ledger

**Cause.** Design: docs/coordination/OWNER-DECISIONS.md, Nov 8 night Coordinator call "Counted payroll: the same rule, times the count, on the employer's own calendar." `payGroups` in src/core2/counted-money.ts (around line 762) carries a group's arrears in its own book, not in the ledger.

**Fix.** Move the per-group arrears book onto the group record and pay it first when cash returns, with a test that starts a group in arrears and pays it off.

**Time box.** 4 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One model, two tiers: a counted group is paid by the same rule as a named worker, times its count, with no pseudo-person per group. Speed: a year stays within 20 percent of its base. Replace, never layer: no second path is left beside the one ledger shape.

**Done when.** A second session, not the builder, finds in a drawn place of the played world an employer whose cash ran short: its counted group's arrears show on the group record by ledger record id and are paid when cash returns, with totals equal to what the old book paid.

**Waits on.** core-speed-counted-payroll-into-named-ledger-part-2-employer-calendar-settlement.

**Files.** src/core2/counted-money.ts, src/core2/work-payroll-cash.ts, src/core2/work-payroll-cash.test.ts
