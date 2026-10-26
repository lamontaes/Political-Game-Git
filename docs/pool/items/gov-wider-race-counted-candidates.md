---
id: gov-wider-race-counted-candidates
title: "Wider races can draw candidates from the counted residents across their district, by the same candidacy reasons"
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

**What.** src/core2/modules/candidacy.ts lets wider races (county, state legislative, statewide) draw only named officials and the played town's residents, because ordinary residents elsewhere have no candidate records. Use the counted households across the jurisdiction, with district membership, and apply the same candidacy reasons to the counted group times its count; when a counted group yields a runner, fill that person in. Closes SG-GOV-wide-resident-pool.

**Rules.** One model, two tiers: the counted group runs by the full person's candidacy rule times its count, and the filled-in runner matches the group. No dice: running follows resources, ambition and standing.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place and seed named), a state legislative race has a candidate filled in from a counted group outside the town, named by record id with the candidacy reasons, and src/core2/modules/candidacy.test.ts checks it.

**Files.** src/core2/modules/candidacy.ts, src/core2/modules/candidacy.test.ts, src/core2/data/stopgaps.json

**Notes.** Oct 20 (pool feeder): made from the open stopgap row SG-GOV-wide-resident-pool.
