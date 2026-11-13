---
id: gov-town-payers-vehicle-tax
title: "The town's vehicle tax is computed from the vehicles on household records and paid to the treasuries, with the outside group's installment reduced"
area: gov
kind: wiring
priority: 3
size: S
status: dropped
standard: 2
claimed-by:
pr: #5103
after:
blocked-on: gov-town-payers-vehicle-tax-part-1-households-hold-vehicles, gov-town-payers-vehicle-tax-part-2-vehicle-tax-rate, gov-town-payers-vehicle-tax-part-3-pay-and-credit
lead: governing
model: sonnet
effort: low
root: design-one-model-two-tiers
source: added with npm run pool -- add
claimed-at:
checked: fable 2026-11-10
---

**What.** The town's residents owe vehicle and other taxes that only an outside group of payers pays today, though no household record holds a vehicle (checked Oct 16: nothing in the core's households, people or finance state names one). Give households their vehicles from the Census vehicles-available counts by household size and tenure, an estimate with a spread. Compute each household's vehicle tax from them and the law in force, pay it to the treasuries on the due dates in the revenue payers data, and reduce the outside group's installment by the same amount so nothing is paid twice. This item is the three parts below joined in one seam (the folded children gov-vehicle-tax-household-vehicles, gov-vehicle-tax-rate and gov-vehicle-tax-payment are closed into it), and its acceptance is the one-year chain at the end.

**Cause.** Design: docs/coordination/OWNER-DECISIONS.md, "Vehicle tax with no law on record (#5103)" (owner, Oct 21): the rate is the treasury's budgeted vehicle line divided by the vehicles in the jurisdiction, tagged ESTIMATED with its source. Corporate tax already pays a treasury's `townPaidMinor` from the town's payers in src/core2/modules/employer-taxes.ts, and src/core2/town-payers-corporate-tax.test.ts is the balance test to copy.

**Fix.** Do it in the three parts, in order: part 1 gives households vehicles; part 2 computes the rate from the law row or from the treasury's own vehicle budget line divided by its vehicles; part 3 pays the tax household to treasury and cuts the outside installment by the same amount. This parent then proves the whole chain in one played year and closes the parts' Notes lines.

**Time box.** 2 hours for one Sonnet session, the closing check after the parts. When it runs out, write what was seen in the item and stop.

**Rules.** An effect is a read, not a record: the treasury reads the vehicle records at the moment the tax is due. One model, two tiers: a counted household's vehicles are read by the same rule as a full household's, times its count. Replace, never layer: the outside group's share of this line is cut in the same change. Estimate, never UNKNOWN: a place without a rate row starts from the treasury's budget-derived rate, marked ESTIMATED with its source.

**Done when.** A second session, not the builder, runs a one-year played world (`buildBenchWorld`) in a drawn place and a seed the builder did not choose, both named. A household's vehicle tax is paid on the due date from its cash to a named treasury by journal record id, the outside group's installment on that line is smaller by the same amount, and every dollar balances. A test in src/core2 proves it and draws a random place from all 56.

**Waits on.** The three parts: gov-town-payers-vehicle-tax-part-1-households-hold-vehicles, gov-town-payers-vehicle-tax-part-2-vehicle-tax-rate, gov-town-payers-vehicle-tax-part-3-pay-and-credit.

**Files.** src/core2/budgets-treasury.ts, src/core2/modules/budgets.ts, src/core2/data/budgets/revenue-payers.json, src/core2/population.ts, src/core2/state.ts, src/core2/data/laws/, src/core2/modules/employer-taxes.ts, src/core2/town-payers-corporate-tax.test.ts, src/core2/data/vehicles/ (new)

**Notes.** Split from gov-town-payers-vehicle-and-owner-tax (the owner-profit half is built there).

Looked at Oct 19 (claude/vehicle-tax), nothing built. Three gaps sit under this item that a builder must close first: (1) no household holds a vehicle, so the Census counts by household size and tenure need a data file and a place for the record (people or households state); (2) no law row sets a vehicle or personal-property tax rate (starting-law.json mentions vehicles only in a customs note), so the rate has no law to read for any of the 56 places and needs either sourced state rows or a rate derived from each treasury's own vehicleAndOtherTaxes budget line divided by its vehicle count, which is an owner call (register an owner-decision stopgap and build the budget-derived version); (3) the vehicleAndOtherTaxes line belongs to the state and federal treasuries, not the town's, so a resident's payment must be credited to the right treasury's townPaidMinor the way modules/employer-taxes.ts does for corporate tax (see src/core2/town-payers-corporate-tax.test.ts for the balance test to copy). Split into: gov-vehicle-tax-household-vehicles (data and records, S/M), gov-vehicle-tax-rate (law or derived rate, M), gov-vehicle-tax-payment (pay and credit the outside installment, M).

Oct 21 (merger): PR #5103 supplies the three child specifications gov-vehicle-tax-household-vehicles, gov-vehicle-tax-rate and gov-vehicle-tax-payment. This implementation parent remains open with its named one-year payment, treasury-credit and dollar-balance acceptance unchanged. The question in the Oct 19 note is already answered in docs/coordination/OWNER-DECISIONS.md under "Vehicle tax with no law on record (#5103)": use the treasury budgeted vehicle line divided by vehicles in the jurisdiction, tagged ESTIMATED with its source. No new owner decision is needed.

Folded in Oct 25 from gov-vehicle-tax-household-vehicles. Its done when: In a played world in a drawn place, every household record carries a vehicle count whose total across the town is within the table's spread of the Census figure for that place's size, and a clicked counted household's count is the same as its group's. A test in src/core2 draws a random place from all 56 with a named seed and proves it in buildBenchWorld over a one-year run, naming the record ids.

Folded in Oct 25 from gov-vehicle-tax-rate. Its done when: In a played world in a drawn place, the rate a household would owe is shown by law row id or by budget line id. Where the budget-derived fallback is used, the sum over the jurisdiction's vehicles equals that budgeted line; a sourced statutory rate keeps its own value. A test in src/core2 draws a random place from all 56 with a named seed and proves it in buildBenchWorld over a one-year run, naming the record ids.

Folded in Oct 25 from gov-vehicle-tax-payment. Its done when: In a played world in a drawn place over one year, each payment is a journal record from a named household to a named treasury, every installment's outside amount plus the town's credit equals the installment, and every dollar balances. A test in src/core2 draws a random place from all 56 with a named seed and proves it in buildBenchWorld over a one-year run, naming the record ids.

Deferred Oct 25: nothing on screen reads it yet.

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have given every household vehicles and taxed them; the outside group already pays that tax, so no player sees the difference.
