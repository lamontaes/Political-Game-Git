---
id: world-credit-and-housing
title: "Credit and housing."
area: world
kind: feature
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "docs/coordination/world.md line 53 (unchecked checklist line)"
---

**What.** Credit and housing is the world checklist line that remains open after the economy branch. Business credit lines by owners' choice, household loans, mortgages, buying, property tax, construction, zoning, landlords' patience and evictions by each place's steps are built. Still open are deposits at the town bank and counted households moving in to fill new homes. The player would notice a bank that lends from real deposits that balance, and new homes that get lived in.

**Rules.** Wire to the world: banks and loans must balance and move real dollars, with rent, buying and evictions following each place's legal steps. One model, two tiers: counted households deposit, borrow and move in under the same rules as full ones. One rule, all 56 places: eviction steps come from data. Verify against main before starting: this line may be done.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56, seed named) the town bank's deposit record ids come from named and counted households and the bank's books balance, and a new home is occupied by an arriving household record id. The tests in src/core2/bank-deposits.test.ts, src/core2/credit.test.ts and src/core2/housing-construction.test.ts pass. The owner plays it: save money in the town bank and see a new house get a family.

**Files.** src/core2/modules/credit.ts, src/core2/credit-deposits.ts, src/core2/modules/housing.ts, src/core2/housing-construction.ts, docs/coordination/world.md

**Notes.** Checklist line from world.md; verify against main before starting.
