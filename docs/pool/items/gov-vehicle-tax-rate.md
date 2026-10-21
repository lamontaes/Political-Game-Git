---
id: gov-vehicle-tax-rate
title: "A vehicle tax rate per vehicle comes from the law in force or from each treasury's own budget line"
area: gov
kind: wiring
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
after: gov-vehicle-tax-household-vehicles
source: split from gov-town-payers-vehicle-tax
---

**What.** Give the vehicle and other taxes line a per-vehicle rate: from a sourced law row where a place has one, otherwise the treasury's budgeted line divided by the vehicles in its jurisdiction, tagged ESTIMATED with the budget source and a spread under the existing ruling. This is one slice of vehicle-tax work: household vehicle records, the rate input and the treasury payment path have distinct acceptance checks. Build only this slice, on the core's existing modules and data rows, and register any stand-in as a stopgap.

**Rules.** One model, two tiers: a counted household is read by the same rule as a full household, times its count. One rule, all 56 places: no state, city or GEOID named in logic. An effect is a read, not a record: the next slice must read what this one writes at the moment the tax is due.

**Done when.** In a played world in a drawn place, the rate a household would owe is shown by law row id or by budget line id, and the sum over the jurisdiction's vehicles equals the budgeted line. A test in src/core2 draws a random place from all 56 with a named seed and proves it in buildBenchWorld over a one-year run, naming the record ids.

**Files.** src/core2/data/laws/, src/core2/budgets-treasury.ts, src/core2/data/budgets/revenue-payers.json

**Notes.** Split Oct 19 from gov-town-payers-vehicle-tax; see its notes for the three gaps found.

The ruling in docs/coordination/OWNER-DECISIONS.md ("Vehicle tax with no law on record (#5103)") already authorizes: "estimated from the treasury's budgeted vehicle line divided by vehicles in the jurisdiction, tagged ESTIMATED with the source ("estimate, never UNKNOWN")." Build under that ruling; no new owner decision is needed.
