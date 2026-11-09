---
id: core-speed-counted-payroll-into-named-ledger
title: "Counted workers' settlement and arrears kept in the named payroll ledger"
area: core
kind: cleanup
priority: 3
size: L
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Counted employers' wage flows (residents.ts flows, counted-money.ts payGroups) settle on the employer's recorded payday and share withholding (withholdingFor) and the employer payroll tax (payEmployerShare) with named workers, but keep their own settlement and per-group arrears outside the named payroll ledger (work-payroll-cash.ts, about 2,400 lines that validate one person per receipt). Merge the storage: one ledger record per employer and group with a head count, with no pseudo-person and no second path inside the named ledger. Money finding, Nov 8; the Coordinator accepted the sizing.

**Rules.** One model, two tiers; no pseudo-person per group; speed bar: a year within 20 percent of its base

**Done when.** A played year at two or three random places from all 56 shows every counted and named worker paid once per period from one ledger shape, speed:year within 20 percent, lines removed counted

**Files.** src/core2/work-payroll-cash.ts, src/core2/work-pay-period.ts, src/core2/counted-money.ts, src/core2/modules/residents.ts

**Notes.** TODO
