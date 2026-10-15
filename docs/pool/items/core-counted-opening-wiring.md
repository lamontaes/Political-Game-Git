---
id: core-counted-opening-wiring
title: "Counted households from the opening generator get jobs, rent and school seats in the town's economy"
area: core
kind: wiring
priority: 1
size: M
status: blocked
claimed-by:
pr:
blocked-on: core-counted-opening-generator
milestone:
source: "split from core-town-size-census"
---

**What.** The counted households that `core-counted-opening-generator` adds are read by every engine like full people times their count: employers' payroll and job counts, rent and mortgage flows, taxes and benefits, voter groups and districts. Remove the 10,000 `targetPopulation` clamp so a town above 10,000 opens at its Census size.

**Rules.** One model, two tiers; an effect is a read; the chain is the acceptance; the speed guard (a game year under two minutes, no more than 20% slower).

**Done when.** A one-year played world in a drawn place above 10,000 (a seed the builder did not choose) opens at its Census count; employer payroll, rent flows and voter groups total to the counted households by record id; the closure proof and the speed guard pass.

**Files.** src/core2/population.ts, src/core2/residents-economy.ts, src/bench/world.ts

**Notes.** Ruling core-od-town-size (OWNER-DECISIONS.md line 187).
