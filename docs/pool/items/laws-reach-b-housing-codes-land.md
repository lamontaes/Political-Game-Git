---
id: laws-reach-b-housing-codes-land
title: "A gas-hookup ban changes new-construction cost and fuel choice; farmland protection zones parcels the builders read"
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

**What.** SG-GOV-REACH-B-building-cost and -land-use. A gas-hookup ban and farmland protection are compliance records with no effect on construction. Give the construction engine a building code in force (all-electric adds a sourced cost per new home and sets its fuel) and land parcels with a protected use that new construction cannot take.

**Rules.** An effect is a read, not a record: another engine must read what the law writes, at the moment it decides or pays. One model, two tiers: counted households get the same rule times their count. Numbers are tagged SOURCED, ESTIMATED or TUNABLE in the parameter table.

**Done when.** In a one-year played world (`buildBenchWorld`, a drawn place from all 56, seed named in the PR body), another engine reads what the law wrote, named by record id, and the listed stopgap rows are resolved in `stopgaps.json` with a test in the file that owns the engine.

**Files.** src/core2/housing-construction.ts, src/core2/law-reach/group-b.ts, src/core2/data/stopgaps.json

**Notes.** Split from laws-stopgap-reach-group-b-missing-engine on Oct 19; the stopgap rows named above are its 13.
