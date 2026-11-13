---
id: gov-town-payers-vehicle-tax-part-3-pay-and-credit
title: "A household pays its vehicle tax from its cash on the due date and the outside group's installment shrinks by the same amount"
area: gov
kind: wiring
priority: 3
size: M
status: dropped
standard: 2
claimed-by:
pr:
after: gov-town-payers-vehicle-tax-part-1-households-hold-vehicles, gov-town-payers-vehicle-tax-part-2-vehicle-tax-rate
blocked-on:
lead: governing
model: opus
effort: medium
root: design-one-model-two-tiers
source: split from gov-town-payers-vehicle-tax in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** With vehicles on households and a rate, a household must pay its vehicle tax from its own cash on the due date in the revenue payers data, and the outside group of payers must pay that much less on the same installment, so nothing is paid twice. The line belongs to the state and federal treasuries, not the town's, so a resident's payment is credited to the right treasury's `townPaidMinor` the way corporate tax is. Counted households pay by the same rule times their count.

**Cause.** Found in code: src/core2/modules/employer-taxes.ts credits corporate tax paid by the town's payers to a treasury's `townPaidMinor` and src/core2/town-payers-corporate-tax.test.ts is its balance test; the vehicle line has no such credit today (src/core2/data/budgets/revenue-payers.json holds the line and its due dates).

**Fix.** On each due date, compute each household's tax (part 2), move it from the household to the right treasury on the journal, credit the treasury's `townPaidMinor`, and cut the outside group's installment on that line by the same total. Copy the balance test from the corporate-tax test.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record: the treasury reads the households' vehicle records and the rate when the tax is due. One model, two tiers: counted households pay by the same rule times their count. Replace, never layer: the outside group's share of this line is cut in the same change. The chain is the acceptance: one dollar is followed from the household to the treasury, by journal id.

**Done when.** A second session, not the builder, runs a one-year played world (`buildBenchWorld`) in a place drawn from all 56 and a seed the builder did not choose, both named. Each payment is a journal record from a named household to a named treasury, every installment's outside amount plus the town's credit equals the installment, and every dollar balances. A test in src/core2 names the journal ids.

**Waits on.** gov-town-payers-vehicle-tax-part-1-households-hold-vehicles and gov-town-payers-vehicle-tax-part-2-vehicle-tax-rate.

**Files.** src/core2/modules/budgets.ts, src/core2/budgets-treasury.ts, src/core2/modules/employer-taxes.ts, src/core2/town-payers-corporate-tax.test.ts, src/core2/data/budgets/revenue-payers.json, src/core2/vehicle-tax-pay.test.ts (new)

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have given every household vehicles and taxed them; the outside group already pays that tax, so no player sees the difference.
