---
id: law-levels-income-rate-zero-restoration
title: "An income-tax rate can return after zero without losing its bracket schedule"
area: laws
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The numeric income-tax bill writer scales every retained bracket to zero when a bill sets the top rate to zero. A later bill restoring a positive rate sees an all-zero schedule and keeps collecting zero. Preserve the schedule needed for restoration while the existing withholding reader applies a zero active rate, so an income tax can be repealed and passed again through the amount route.

**Rules.** One engine per mechanic: use shapedRate and the existing withholding reader at each level. Preserve real schedules and deductions; do not invent replacement brackets, bypass legislative authority, or change protected campaigns, electorate, views or wage bars.

**Done when.** In a buildBenchWorld drawn place with a printed replay, a real bill draft and production signature/effective-date path sets an active graduated income-tax rate to zero and restores it. Named and counted withholding returns to its prior amount, other levels remain unchanged, the old writer fails the regression, and ten fresh draws plus a new game pass.

**Files.** src/core2/modules/legislature.ts,src/core2/income-rate-zero-restoration.test.ts

**Notes.** Astra Nov 8: shapedRate computes scale=provision.value/top, so zero destroys all bracket rates and the later top=0 branch uses scale=1. The withholding reader already handles a zero rate with retained nonzero brackets (done item laws-zero-top-rate-retains-withholding, PR 6193). This is distinct from opening policy adoption repeal/restoration in PR 7337. Read source and prior pool items; no implementation yet.
