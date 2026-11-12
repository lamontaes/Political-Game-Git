---
id: core-speed-counted-payroll-into-named-ledger-part-4-delete-second-path
title: "Delete the counted settlement code that the one ledger replaces"
area: core
kind: cleanup
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after: core-speed-counted-payroll-into-named-ledger-part-3-arrears-per-group
blocked-on:
lead: money
model: opus
effort: high
root: design-one-model-two-tiers
source: split from core-speed-counted-payroll-into-named-ledger in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** Once parts 1 to 3 pay every counted group through the one ledger, the counted settlement code in `payGroups` (src/core2/counted-money.ts) has no caller. Delete it and its markers, count the lines removed in the PR body, and prove the year did not slow. This is part 4 of core-speed-counted-payroll-into-named-ledger. Feeds: core-speed-counted-payroll-into-named-ledger

**Cause.** Design: docs/coordination/OWNER-DECISIONS.md, Nov 8 night Coordinator call "Counted payroll: the same rule, times the count, on the employer's own calendar." `payGroups` in src/core2/counted-money.ts (line 584) is the second settlement path the owner's call says to merge away.

**Fix.** Delete the settlement and arrears code in `payGroups` that parts 1 to 3 replaced, with its tests moved to the ledger, and run `npm run speed:year` against the base.

**Time box.** 3 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One model, two tiers: a counted group is paid by the same rule as a named worker, times its count, with no pseudo-person per group. Speed: a year stays within 20 percent of its base. Replace, never layer: no second path is left beside the one ledger shape.

**Done when.** A second session, not the builder, plays a one-year buildBenchWorld in a drawn place (place and seed named) and payroll totals match the base; the lines removed are counted in the PR body and `npm run speed:year` stays within 20 percent of its base.

**Waits on.** core-speed-counted-payroll-into-named-ledger-part-3-arrears-per-group.

**Files.** src/core2/counted-money.ts, src/core2/modules/residents.ts
