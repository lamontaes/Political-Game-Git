---
id: core-speed-counted-payroll-into-named-ledger
title: "Counted workers' settlement and arrears kept in the named payroll ledger"
area: core
kind: cleanup
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on: core-speed-counted-payroll-into-named-ledger-part-1-group-record-shape, core-speed-counted-payroll-into-named-ledger-part-2-employer-calendar-settlement, core-speed-counted-payroll-into-named-ledger-part-3-arrears-per-group, core-speed-counted-payroll-into-named-ledger-part-4-delete-second-path
model: sonnet
effort: low
root: design-one-model-two-tiers
lead: money
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** Counted employers' wage flows (src/core2/modules/residents.ts flows, `payGroups` in src/core2/counted-money.ts) settle on the employer's recorded payday and share withholding (`withholdingFor`, src/core2/tax-withholding.ts) and the employer payroll tax (`payEmployerShare`, src/core2/modules/employer-taxes.ts) with named workers, but keep their own settlement and per-group arrears outside the named payroll ledger (src/core2/work-payroll-cash.ts, about 2,400 lines that validate one person per receipt). Merge the storage: one ledger record per employer and group with a head count, with no pseudo-person and no second path inside the named ledger. Money finding, Nov 8; the Coordinator accepted the sizing. It is built in four parts. Guards: the pay the player reads on a person's card and in the town's totals, which agree because one payroll path pays both, and the year that runs faster without the second path.

**Cause.** Design: docs/coordination/OWNER-DECISIONS.md, Nov 8 night Coordinator call "Counted payroll: the same rule, times the count, on the employer's own calendar. Merging the counted ledger into the named one is pool item `core-speed-counted-payroll-into-named-ledger`." Counted employers' wage flows (src/core2/modules/residents.ts, `payGroups` in src/core2/counted-money.ts line 584) keep settlement and arrears outside src/core2/work-payroll-cash.ts, which validates one person per receipt.

**Fix.** One ledger record per employer and group with a head count, with no pseudo-person and no second path inside the named ledger; counted and named workers are paid once per period from the one shape. Built in the four parts named in blocked-on, in order.

**Time box.** 2 hours for one Sonnet session, the closing check after the four parts. When it runs out, write what was seen in the item and stop.

**Rules.** One model, two tiers: a counted group is paid by the same rule as a named worker, times its count, with no pseudo-person per group. Replace, never layer: the second settlement path in counted-money.ts is deleted in the same change, with the lines counted in the PR body. Speed: a year stays within 20 percent of its base. The chain is the acceptance: one dollar of wages is followed from the employer's record to the group and back out.

**Done when.** A second session, not the builder, plays a one-year buildBenchWorld in two or three drawn places from all 56 (places and seeds named) and shows every counted and named worker paid once per period from one ledger shape, by ledger record id, with the same payroll totals as before, `npm run speed:year` within 20 percent of its base, and the lines removed counted. All four parts are done.

**Waits on.** The four parts (core-speed-counted-payroll-into-named-ledger-part-1-group-record-shape to -part-4-delete-second-path).

**Files.** src/core2/work-payroll-cash.ts, src/core2/work-pay-period.ts, src/core2/counted-money.ts, src/core2/modules/residents.ts

**Notes.** TODO

**Notes (Fable's check, Nov 10).** Before part 1 starts, read core-fast-clock-part-3-prices-pay-and-jobs-in-skipped-time: it makes skipped time pay wages, through the same payroll code these parts change. Build on it if it has merged, and tell its holder if it has not.
