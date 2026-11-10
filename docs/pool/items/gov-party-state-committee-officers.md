---
id: gov-party-state-committee-officers
title: "Each party's state and national committees and officers are recorded, and the candidate pool reads them"
area: gov
kind: stopgap
priority: 3
size: M
status: dropped
claimed-by:
pr:
blocked-on:
standard: 2
model: sonnet
effort: medium
lead: governing
root: rc9-place-facts-one-default
source: added with npm run pool -- add
after:
checked: fable 2026-11-10
---

**What.** The parties engine records one local committee and its chair per party, so src/core2/candidate-pool.ts treats the state party's officers as the local chair. Record each party's state committee (chair, vice chair, treasurer) and national committee chair as named officials, filled in like any official, and have the pool read them. Closes SG-POOL-party-officers-local.

**Cause.** Found in code: src/core2/candidate-pool.ts (lines 424-429) adds each party's leaderId, the local chair, as the party officer; stopgap SG-POOL-party-officers-local is open in src/core2/data/stopgaps/pool.json.

**Fix.** Record each party's state committee (chair, vice chair, treasurer) and national chair as named officials, filled in on first meeting, from data, and have the candidate pool read them. Resolve the stopgap row.

**Time box.** 5 hours for one Sonnet session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** Two-level population: party officers are named people, filled in on first meeting. One rule, all 56 places: committee structure lives in data. Wire to the world: the pool reads the new records.

**Done when.** A second session, in a one-year run of the played world (buildBenchWorld, a drawn place and a seed the builder did not choose, both named), finds the candidate pool's party-officer entries naming state committee officers by record id and not the local chair, and a test in src/core2/candidate-pool.test.ts (new) checks it.

**Waits on.** Nothing.

**Files.** src/core2/modules/parties.ts, src/core2/candidate-pool.ts, src/core2/candidate-pool.test.ts (new), src/core2/data/stopgaps/pool.json

**Notes.** Oct 20 (pool feeder): made from the open stopgap row SG-POOL-party-officers-local.

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have named each party's state and national committee officers; the local chair already stands in and no player sees the difference.
