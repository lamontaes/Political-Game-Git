---
id: core-township-custodial-owner-coverage
title: "A township the town lies in buys custodial services: its coverage of the town is recorded like a county's"
area: core
kind: feature
priority: 3
size: M
status: claimed
claimed-by: claude/township-custodial
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T06:13:29.615Z
---

**What.** After PR #5548 a town that lies inside a township (Robertsdale, Pennsylvania, in the Township of Wood, government gus2025:174495) opens with no custodial contract from that township, because the contract settles only against a recorded owner coverage of the covered place and only counties have the data (opening-public-owner.ts openingHistoricalCountyPlaceCoverage). The township's custody spending should exist: a township pays for the cleaning of its buildings in the town it covers. Record, from the Census Government Units and place-to-county-subdivision relations, which towns a township covers and how many residents, as the identity and coverage sources the county case already carries, so the contract is built and settles.

**Rules.** One rule, all 56 places: coverage comes from data rows for any township or borough owner, no place named. Wire to the world: the township's custodial dollar follows the journal to a supplier. Estimate, never UNKNOWN: where the share of the town the township covers is not recorded, the town's resident share marks ESTIMATED with its source. Replace, never layer: the gap opening-customers:public-owner-outside-covered-place-without-coverage is deleted when the record exists.

**Done when.** In buildBenchWorld for Robertsdale, Pennsylvania (seed 3c95bb8562a14177f929263165b4517d25ed5263bf83f68c84dead5d0aae3069:2) the Township of Wood buys custodial services, the first payment on 2026-11-01 is on the journal by record id and reaches a supplier's staff member by id, and the gap above is no longer recorded for that place; a test in src/core2 draws places named in the PR body.

**Files.** src/core2/opening-public-owner.ts, src/core2/opening-customers.ts, src/core2/finance-cash.ts

**Notes.** Follow-up of core-opening-public-custodial-owner-coverage-crash (#5548).
