---
id: world-credit-and-housing
title: "Credit and housing."
area: world
kind: feature
priority: 2
status: done
claimed-by: claude/world-credit-housing-check
pr: #4532
blocked-on:
milestone:
source: "docs/archive/2026-10-23/coordination/world.md line 53 (unchecked checklist line)"
claimed-at: 2026-10-15T23:54:16.423Z
---

**What.** Credit and housing is the world checklist line that remains open after the economy branch. Business credit lines by owners' choice, household loans, mortgages, buying, property tax, construction, zoning, landlords' patience and evictions by each place's steps are built. Still open are deposits at the town bank and counted households moving in to fill new homes. The player would notice a bank that lends from real deposits that balance, and new homes that get lived in.

**Rules.** Wire to the world: banks and loans must balance and move real dollars, with rent, buying and evictions following each place's legal steps. One model, two tiers: counted households deposit, borrow and move in under the same rules as full ones. One rule, all 56 places: eviction steps come from data. Verify against main before starting: this line may be done.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56, seed named) the town bank's deposit record ids come from named and counted households and the bank's books balance, and a new home is occupied by an arriving household record id. The tests in src/core2/bank-deposits.test.ts, src/core2/credit.test.ts and src/core2/housing-construction.test.ts pass. The owner plays it: save money in the town bank and see a new house get a family.

**Files.** src/core2/modules/credit.ts, src/core2/credit-deposits.ts, src/core2/modules/housing.ts, src/core2/housing-construction.ts, docs/archive/2026-10-23/coordination/world.md

**Notes.** Checklist line from world.md; verify against main before starting.

**Checked Oct 15 (claude/world-credit-housing-check, no code written).** Deposits are built. In a played year in Cathcart, Washington (seed 096e3764726d5bac) the town bank recorded 964 deposit moves: 535 deposits and 7 withdrawals by full households, 230 deposits and 162 withdrawals by counted households, and 18 deposits and 12 withdrawals by businesses (first record `bank-deposit:organization:bank:jurisdiction_bf10190334c46f78:2025-01-21:household_44b7b50307925042:0`). `bank-deposits.test.ts` (4 tests, including that one household and a counted group follow the same cost-buffer rule), `credit.test.ts` (2) and `housing-construction.test.ts` (2) pass on fresh random seeds. What is left is counted households moving into new homes, which is `world-new-homes-finish` (in a PR). The bank's deposit moves are read only by a proof script, which is `core-unread-deposit-moves`.
