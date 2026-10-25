---
id: gov-vehicle-tax-payment
title: "A household pays its vehicle tax from its cash on the due date and the outside group's installment shrinks by the same amount"
area: gov
kind: wiring
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
after: gov-vehicle-tax-rate
source: split from gov-town-payers-vehicle-tax
---

**What.** On each due date in the revenue payers data, pay each household's vehicle tax from its cash to the right treasury and credit it against the outside group's installment through townPaidMinor, the way the corporate profit tax already does. This is one slice of vehicle-tax work: household vehicle records, the rate input and the treasury payment path have distinct acceptance checks. Build only this slice, on the core's existing modules and data rows, and register any stand-in as a stopgap.

**Rules.** One model, two tiers: a counted household is read by the same rule as a full household, times its count. One rule, all 56 places: no state, city or GEOID named in logic. An effect is a read, not a record: the next slice must read what this one writes at the moment the tax is due.

**Done when.** In a played world in a drawn place over one year, each payment is a journal record from a named household to a named treasury, every installment's outside amount plus the town's credit equals the installment, and every dollar balances. A test in src/core2 draws a random place from all 56 with a named seed and proves it in buildBenchWorld over a one-year run, naming the record ids.

**Files.** src/core2/modules/budgets.ts, src/core2/budgets-treasury.ts, src/core2/modules/employer-taxes.ts

**Notes.** Split Oct 19 from gov-town-payers-vehicle-tax; see its notes for the three gaps found.
