---
id: core-opening-public-custodial-owner-coverage-crash
title: "A township's opening custodial contract stops the game on its first due day: the buyer was re-homed after the contract was built (Robertsdale, Pennsylvania)"
area: core
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** buildBenchWorld with seed 3c95bb8562a14177f929263165b4517d25ed5263bf83f68c84dead5d0aae3069:2 (Robertsdale, Pennsylvania, key 4265296) stops in advanceCore on 2026-11-01 with 'Actual customer public owner coverage record is missing' (finance-cash.ts publicCustomerRecords, via settleFinanceContract). The contract is p8-opening-customer-builder-v1:public-agreement:gus2025:174495 (custodial services) bought by Township of Wood, whose organization has placeId jurisdiction_2616a930aa215a53 at settlement while its appropriation covers the town's place jurisdiction_f530a311fd1974a1 and holds no ownerCoverage record. opening-customers.ts writes ownerCoverage only when the group has identity and coverage sources, which a non-county buyer's group never has, so the settlement check (buyer placeId differs from the covered place) fails: the buyer's place was different from the covered place by the time of settlement, though the builder grouped it under the covered place. Find where the township's placeId is changed after the opening customers are built (or why the group is keyed to the town) and make the contract record what settlement needs, or leave the contract unbuilt with a registered gap.

**Rules.** No dice: coverage follows the township's recorded jurisdiction; Replace, never layer: no skip of the check, the record is made or the contract is not built; One rule, all 56 places: the check runs in the drawn place with the seed named; The chain is the acceptance: follow the township's custodial dollar to the supplier.

**Done when.** buildBenchWorld with the seed above advances 60 days without stopping, a test in src/core2 draws places (name and seed in the PR body) and advances each 60 days, and the township's custodial payment is on the journal by record id.

**Files.** src/core2/opening-customers.ts, src/core2/finance-cash.ts, src/core2/civic-inputs.ts

**Notes.** TODO
