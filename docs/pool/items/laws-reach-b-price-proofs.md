---
id: laws-reach-b-price-proofs
title: "Transit fare, mileage fee, broadband bill and clean-energy price: replace their estimated use with records and prove the chain in a played year"
area: laws
kind: stopgap
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** SG-GOV-REACH-B-transit-fare-price, -mileage-fee-price, -broadband-bill and -energy-price. The price engine already reads each law and refunds or charges full and counted households, but the fare, miles, broadband bill and metered electricity are national estimates. Replace each estimate with the household's own record where one exists (its bus trips, its vehicle miles, its internet contract, its metered use), and prove the chain for one household per law: the law record, the journal payment, the notice the household received, the stance it formed and the director's line.

**Rules.** An effect is a read, not a record: another engine must read what the law writes, at the moment it decides or pays. One model, two tiers: counted households get the same rule times their count. Numbers are tagged SOURCED, ESTIMATED or TUNABLE in the parameter table.

**Done when.** In a one-year played world (`buildBenchWorld`, a drawn place from all 56, seed named in the PR body), another engine reads what the law wrote, named by record id, and the listed stopgap rows are resolved in `stopgaps.json` with a test in the file that owns the engine.

**Files.** src/core2/modules/place-prices.ts, src/core2/data/laws/reach-group-b.json, src/core2/data/stopgaps.json

**Notes.** Split from laws-stopgap-reach-group-b-missing-engine on Oct 19; the stopgap rows named above are its 13.
