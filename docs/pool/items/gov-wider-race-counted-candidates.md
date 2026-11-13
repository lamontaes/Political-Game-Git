---
id: gov-wider-race-counted-candidates
title: "Wider races can draw candidates from the counted residents across their district, by the same candidacy reasons"
area: gov
kind: stopgap
priority: 3
size: M
status: dropped
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
model: opus
effort: medium
root: design-one-model-two-tiers
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** Wider races (county, state legislative, statewide) draw candidates only from named officials and the played town's residents, because ordinary residents elsewhere have no candidate records. Use the counted households across the jurisdiction, with district membership, and apply the same candidacy reasons to the counted group times its count. When a counted group yields a runner, fill that person in so the person matches the group. This closes the registered stopgap SG-GOV-wide-resident-pool.

**Cause.** Found in code: src/core2/modules/candidacy.ts (line 916 registers SG-GOV-wide-resident-pool for state and federal contests; `standingPool`, imported at line 3, draws named officials and the played town's residents only). The stopgap row is in src/core2/data/stopgaps/gov.json.

**Fix.** For a wider contest, build the pool from counted households in the jurisdiction by the candidacy reasons the full person's rule uses (resources, ambition, standing), times the group's count. Fill in a runner from a group when that group yields one. Mark SG-GOV-wide-resident-pool resolved.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One model, two tiers: the counted group runs by the full person's candidacy rule times its count, and the filled-in runner matches the group. No dice: running follows resources, ambition and standing, never a roll. One rule, all 56 places: no place or office level is named in logic beyond what the jurisdiction data says.

**Done when.** A second session, not the builder, runs a one-year played world (`buildBenchWorld`) in a drawn place and seed (both named). A state legislative race there has a candidate filled in from a counted group outside the town, named by record id with the candidacy reasons, and the test in src/core2/candidacy-in-play.test.ts checks it. The stopgap row SG-GOV-wide-resident-pool is resolved.

**Waits on.** Nothing to start. core-race-candidates-who-runs (candidates for out-of-town races) and elections-out-party-fields-district-seats (the out-party's candidate for a district seat) change the same pool of who runs beyond the town: read both first, and build one chooser, not a third.

**Files.** src/core2/modules/candidacy.ts, src/core2/candidacy-in-play.test.ts, src/core2/data/stopgaps/gov.json

**Notes.** Oct 20 (pool feeder): made from the open stopgap row SG-GOV-wide-resident-pool.

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have widened the pool of candidates in county, state and statewide races to counted residents; those races already have candidates.
