---
id: gov-town-payers-vehicle-tax-part-1-households-hold-vehicles
title: "Households hold vehicles, counted from the Census vehicles-available tables"
area: gov
kind: wiring
priority: 3
size: M
status: dropped
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
model: sonnet
effort: medium
root: design-one-model-two-tiers
source: split from gov-town-payers-vehicle-tax in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** No household record holds a vehicle, so no vehicle tax can read one. Give every household a vehicle count drawn from the Census vehicles-available counts by household size and tenure, an estimate with a spread, and keep the count where the household's other records live. A counted household carries the same count per member of its group, so a clicked counted household shows the number its group stands on. This is data and a record only; the tax is the next parts.

**Cause.** Found in code: `buildPopulation` in src/core2/population.ts (line 560) builds the households and src/core2/state.ts keeps the household and people state, and neither holds a vehicle field (nothing in them names one, checked Oct 16); the gap is the first of three the parent names. Design: docs/coordination/OWNER-DECISIONS.md, "Vehicle tax with no law on record (#5103)" (owner, Oct 21).

**Fix.** Add a sourced data file of the Census vehicles-available distribution by household size and tenure at src/core2/data/vehicles/vehicles-available.json (new), with source and spread on every row. Seed each household's vehicle count from it when households are built, deterministically from the world seed, and let counted groups carry the same distribution times their count. Show nothing new on a screen.

**Time box.** 6 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One model, two tiers: a counted household's vehicles are read by the same rule as a full household's, times its count. Estimate, never UNKNOWN: each count starts from the real distribution with a per-world spread, marked ESTIMATED with its source. One rule, all 56 places: the table is national data by household size and tenure and no place is named in code. Research before building: cite the Census table and year in the data file.

**Done when.** A second session, not the builder, runs a one-year played world (`buildBenchWorld`) in a place drawn from all 56 and a seed the builder did not choose, both named. Every household record carries a vehicle count, the town's total is reported next to the Census figure for a place of that size with its spread (a figure to report, not a pass mark), and a clicked counted household's count equals its group's. A test in src/core2 names the household record ids it read.

**Waits on.** Nothing.

**Files.** src/core2/population.ts, src/core2/state.ts, src/core2/data/vehicles/vehicles-available.json (new), src/core2/vehicles.test.ts (new)

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have given every household vehicles and taxed them; the outside group already pays that tax, so no player sees the difference.
