---
id: gov-town-payers-vehicle-tax
title: "The town's vehicle tax is computed from the vehicles on household records and paid to the treasuries, with the outside group's installment reduced"
area: gov
kind: wiring
priority: 2
size: M
status: in-pr
claimed-by:
pr: #5103
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The town's residents owe vehicle and other taxes that only an outside group of payers pays today, though no household record holds a vehicle (checked Oct 16: nothing in the core's households, people or finance state names one). First give households their vehicles, from the Census vehicles-available counts by household size and tenure (an estimate with a spread). Then compute each household's vehicle tax from them and the law in force, and pay it to the treasuries on the due dates in the revenue payers data. Reduce the outside group's installment by the same amount, so nothing is paid twice.

**Rules.** An effect is a read, not a record: the treasury reads the vehicle records at the moment the tax is due. One model, two tiers: a counted household's vehicles are read by the same rule as a full household's, times its count. Replace, never layer: the outside group's share of this line is cut in the same change.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, a household's vehicle tax is paid on the due date from its cash to a named treasury by journal record id, the outside group's installment on that line is smaller by the same amount, and every dollar balances. A test in src/core2 proves it.

**Files.** src/core2/budgets-treasury.ts, src/core2/modules/budgets.ts, src/core2/data/revenue-payers/

**Notes.** Split from gov-town-payers-vehicle-and-owner-tax (the owner-profit half is built there).

Looked at Oct 19 (claude/vehicle-tax), nothing built. Three gaps sit under this item that a builder must close first: (1) no household holds a vehicle, so the Census counts by household size and tenure need a data file and a place for the record (people or households state); (2) no law row sets a vehicle or personal-property tax rate (starting-law.json mentions vehicles only in a customs note), so the rate has no law to read for any of the 56 places and needs either sourced state rows or a rate derived from each treasury's own vehicleAndOtherTaxes budget line divided by its vehicle count, which is an owner call (register an owner-decision stopgap and build the budget-derived version); (3) the vehicleAndOtherTaxes line belongs to the state and federal treasuries, not the town's, so a resident's payment must be credited to the right treasury's townPaidMinor the way modules/employer-taxes.ts does for corporate tax (see src/core2/town-payers-corporate-tax.test.ts for the balance test to copy). Split into: gov-vehicle-tax-household-vehicles (data and records, S/M), gov-vehicle-tax-rate (law or derived rate, M), gov-vehicle-tax-payment (pay and credit the outside installment, M).
