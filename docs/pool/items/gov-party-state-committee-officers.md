---
id: gov-party-state-committee-officers
title: "Each party's state and national committees and officers are recorded, and the candidate pool reads them"
area: gov
kind: stopgap
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The parties engine records one local committee and its chair per party, so src/core2/candidate-pool.ts treats the state party's officers as the local chair. Record each party's state committee (chair, vice chair, treasurer) and national committee chair as named officials, filled in like any official, and have the pool read them. Closes SG-POOL-party-officers-local.

**Rules.** Two-level population: party officers are named people, filled in on first meeting. One rule, all 56 places: committee structure lives in data. Wire to the world: the pool reads the new records.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place and seed named), the candidate pool's party-officer entries name state committee officers by record id, not the local chair, and src/core2/candidate-pool.test.ts checks it.

**Files.** src/core2/modules/parties.ts, src/core2/candidate-pool.ts, src/core2/candidate-pool.test.ts, src/core2/data/stopgaps.json

**Notes.** Oct 20 (pool feeder): made from the open stopgap row SG-POOL-party-officers-local.
