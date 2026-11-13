---
id: gov-town-payers-vehicle-tax-part-2-vehicle-tax-rate
title: "A vehicle tax rate per vehicle comes from the law in force or from the treasury's own budget line"
area: gov
kind: wiring
priority: 3
size: M
status: dropped
standard: 2
claimed-by:
pr:
after: gov-town-payers-vehicle-tax-part-1-households-hold-vehicles
blocked-on:
lead: governing
model: sonnet
effort: medium
root: design-one-model-two-tiers
source: split from gov-town-payers-vehicle-tax in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** No law row sets a vehicle or personal-property tax rate for any of the 56 places, so the tax has nothing to read. Where a sourced statutory rate exists, a law row carries it. Everywhere else the rate is the treasury's budgeted vehicle line divided by the vehicles in its jurisdiction, as the owner ruled, marked ESTIMATED with its source. A household's tax is its vehicle count times the rate.

**Cause.** Design: docs/coordination/OWNER-DECISIONS.md, "Vehicle tax with no law on record (#5103)" (owner, Oct 21): estimate from the treasury's budgeted vehicle line divided by the vehicles in the jurisdiction. Found in code: `vehicleAndOtherTaxes` is a line in src/core2/data/budgets/revenue-payers.json and src/core2/data/budgets/line-names.json, and src/core2/data/laws/starting-law.json mentions vehicles only in a customs note.

**Fix.** Add a function in src/core2/budgets-treasury.ts that returns a vehicle tax rate for a household by law row id when a row exists, else by the treasury's `vehicleAndOtherTaxes` line over the jurisdiction's vehicle total (from part 1). It shows which source it used. Do not charge anyone yet; part 3 charges.

**Time box.** 5 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Estimate, never UNKNOWN: the budget-derived rate is marked ESTIMATED with the treasury line as its source. One rule, all 56 places: the rate is read from law rows or the treasury's budget and no place is named in code. An effect is a read, not a record: the rate is read at the moment a household's tax is computed. Look before you ask: the question is answered in OWNER-DECISIONS, so build the ruling and cite it.

**Done when.** A second session, not the builder, runs a one-year played world (`buildBenchWorld`) in a place drawn from all 56 and a seed the builder did not choose, both named. The rate a household would owe is shown by law row id or by budget line id; where the budget-derived rate is used, the sum over the jurisdiction's vehicles equals that budgeted line, and a sourced statutory rate keeps its own value. A test in src/core2 names the record ids.

**Waits on.** gov-town-payers-vehicle-tax-part-1-households-hold-vehicles (the vehicle totals).

**Files.** src/core2/budgets-treasury.ts, src/core2/data/budgets/revenue-payers.json, src/core2/data/budgets/line-names.json, src/core2/data/laws/starting-law.json, src/core2/vehicle-tax-rate.test.ts (new)

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have given every household vehicles and taxed them; the outside group already pays that tax, so no player sees the difference.
