---
id: core-township-custodial-owner-coverage
title: "A township the town lies in buys custodial services: its coverage of the town is recorded like a county's"
area: core
kind: feature
priority: 3
size: M
status: done
claimed-by:
pr: #5566
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** After PR #5548 a town that lies inside a township (Robertsdale, Pennsylvania, in the Township of Wood, government gus2025:174495) opens with no custodial contract from that township, because the contract settles only against a recorded owner coverage of the covered place and only counties have the data (opening-public-owner.ts openingHistoricalCountyPlaceCoverage). The township's custody spending should exist: a township pays for the cleaning of its buildings in the town it covers. Record, from the Census Government Units and place-to-county-subdivision relations, which towns a township covers and how many residents, as the identity and coverage sources the county case already carries, so the contract is built and settles.

**Rules.** One rule, all 56 places: coverage comes from data rows for any township or borough owner, no place named. Wire to the world: the township's custodial dollar follows the journal to a supplier. Estimate, never UNKNOWN: where the share of the town the township covers is not recorded, the town's resident share marks ESTIMATED with its source. Replace, never layer: the gap opening-customers:public-owner-outside-covered-place-without-coverage is deleted when the record exists.

**Done when.** In buildBenchWorld for Robertsdale, Pennsylvania (seed 3c95bb8562a14177f929263165b4517d25ed5263bf83f68c84dead5d0aae3069:2) the Township of Wood buys custodial services, the first payment on 2026-11-01 is on the journal by record id and reaches a supplier's staff member by id, and the gap above is no longer recorded for that place; a test in src/core2 draws places named in the PR body.

**Files.** src/core2/opening-public-owner.ts, src/core2/opening-customers.ts, src/core2/finance-cash.ts

**Notes.** Follow-up of core-opening-public-custodial-owner-coverage-crash (#5548).

Looked at Oct 20 (claude/political-game-pool-3xfqef-23), released unbuilt. The repo holds no place-to-county-subdivision (township) relation: `data/source` has place-to-county (`PLACE_COUNTY_RELATIONS_META` in `opening-public-owner.ts`), place-to-legislative-district and place-to-congressional-district files, and the Census Government Units listing, but none that says which places a township's territory covers or by how many residents. The Census relationship directory I checked (https://www2.census.gov/geo/docs/maps-data/data/rel2020/, reachable from the cloud container) has `cousub/` and `place/` folders whose files relate each geography to its own 2010 vintage (`tab20_cousub20_cousub10_*`, `tab20_place20_place10_*`), so a place-to-township table is not there; a builder looks for the Census Bureau's place-to-county-subdivision relationship (the 2010 `rel` set or a TIGER/Line spatial join) and locks it the way the county table is locked (raw file, SHA-256, `MANIFEST.json`, a reader and a test that the research-data-reader guard sees) before the coverage rows for townships and boroughs can be built. The opening's guard for this case is already on main (#5548, gap `opening-customers:public-owner-outside-covered-place-without-coverage`), so a town inside a township opens, without that township's custodial contract, until the table exists.

Oct 20 (claude/political-game-pool-gonafp), lead for the builder, not built: the table is reachable two ways from the cloud container. (1) The 2020 block assignment files, e.g. https://www2.census.gov/geo/docs/maps-data/data/baf2020/BlockAssign_ST42_PA.zip (6 MB for Pennsylvania), hold `_INCPLACE_CDP.txt` (block to place) and `_MCD.txt` (block to county subdivision); joining them on block gives each place's blocks by township, a block-count share that would be marked ESTIMATED (no population). (2) The P.L. 94-171 geographic header's summary level 070 (State-County-County Subdivision-Place/Remainder) carries each place part's POP100 per subdivision, the same file family the county table already uses at summary level 155 (data/source/place-county-relations/raw/*geo2020.sumlev155.txt), so the township table can be compiled by the same compiler with level 070 added and its inputs locked in artifact-lock.json. Option 2 gives a sourced population share and is the better one.
