---
id: gov-town-payers-vehicle-tax
title: "The town's vehicle tax is computed from the vehicles on household records and paid to the treasuries, with the outside group's installment reduced"
area: gov
kind: wiring
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The town's residents owe vehicle and other taxes that only an outside group of payers pays today, though the household records hold the vehicles. Compute each household's vehicle tax from the vehicles on its record and the law in force, and pay it to the treasuries on the due dates in the revenue payers data. Reduce the outside group's installment by the same amount, so nothing is paid twice.

**Rules.** An effect is a read, not a record: the treasury reads the vehicle records at the moment the tax is due. One model, two tiers: a counted household's vehicles are read by the same rule as a full household's, times its count. Replace, never layer: the outside group's share of this line is cut in the same change.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, a household's vehicle tax is paid on the due date from its cash to a named treasury by journal record id, the outside group's installment on that line is smaller by the same amount, and every dollar balances. A test in src/core2 proves it.

**Files.** src/core2/budgets-treasury.ts, src/core2/modules/budgets.ts, src/core2/data/revenue-payers/

**Notes.** Split from gov-town-payers-vehicle-and-owner-tax (the owner-profit half is built there).
