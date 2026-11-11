---
id: core-speed-counted-payroll-into-named-ledger-part-1-group-record-shape
title: "The named payroll ledger accepts one record per employer and group with a head count"
area: core
kind: cleanup
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: money
model: opus
effort: high
root: design-one-model-two-tiers
source: split from core-speed-counted-payroll-into-named-ledger in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** The named payroll ledger (src/core2/work-payroll-cash.ts) validates one person per receipt, so counted workers are paid elsewhere. Teach it a record per employer and group that carries a head count, so a group is paid once per period through the same shape as a named worker. This is part 1 of core-speed-counted-payroll-into-named-ledger. Feeds: core-speed-counted-payroll-into-named-ledger

**Cause.** Design: docs/coordination/OWNER-DECISIONS.md, Nov 8 night Coordinator call "Counted payroll: the same rule, times the count, on the employer's own calendar." src/core2/work-payroll-cash.ts validates one person per receipt, which is why `payGroups` in src/core2/counted-money.ts (line 584) settles counted wages on its own path.

**Fix.** Add the group record shape (employer, group, head count, gross, withholding, employer share) to the ledger and its validation, and a test that pays one group through it with totals equal to head count times a single worker's pay.

**Time box.** 4 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One model, two tiers: a counted group is paid by the same rule as a named worker, times its count, with no pseudo-person per group. Speed: a year stays within 20 percent of its base. Replace, never layer: no second path is left beside the one ledger shape.

**Done when.** A second session, not the builder, runs the new test in src/core2/work-payroll-cash.test.ts: one group with a head count is paid through the ledger and its totals equal the head count times one worker's pay, by ledger record id, in a drawn place of the played world.

**Waits on.** Nothing.

**Files.** src/core2/work-payroll-cash.ts, src/core2/work-payroll-cash.test.ts, src/core2/work-pay-period.ts
