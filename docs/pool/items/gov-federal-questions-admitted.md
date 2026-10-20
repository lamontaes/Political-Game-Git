---
id: gov-federal-questions-admitted
title: "Admit each federal-only question to background Congress's proposal pool and delete the federal stopgap call"
area: gov
kind: wiring
priority: 3
size: S
status: open
claimed-by:
pr:
after: gov-federal-questions-money-readers, gov-federal-questions-rule-readers
blocked-on: 
milestone:
source: split from gov-stopgap-world-legislating-missing-mechanic by pool feeder Oct 20
---

**What.** Once a federal-only question has a standing answer, members' stances and an effect reader (the three earlier parts), let background Congress file bills on it. In openSession (src/core2/modules/world-legislating.ts) the filers already come from FEDERAL_HOUSE and FEDERAL_SENATE and questionForLevel limits the pool to questions of the federal level; confirm every ready question passes that filter, drop the unready ones with a recorded reason, and delete the api.stopgap('SG-GOV-federal-proposal-coverage') call and its marker so Congress's pool is no longer faked.

**Rules.** Replace, never layer: the stopgap call and comment are deleted in the same change and the row is marked resolved, never deleted. No dice: Congress files what its members' reasons favor where the law in force differs. An effect is a read, not a record: only a question with a reader is admitted. Wire to the world: a federal bill filed here reaches the town through the effect readers.

**Done when.** In a one-year run of the played world (buildBenchWorld, every module installed) in a place drawn from all 56 with a seed the builder did not choose, a federal session files, passes and enacts at least one federal-only bill, shown by session, bill and law record ids, whose law row an engine reads; src/core2/world-legislating-federal.test.ts proves it and SG-GOV-federal-proposal-coverage is resolved in src/core2/data/stopgaps.json.

**Files.** src/core2/modules/world-legislating.ts, src/core2/data/stopgaps.json, src/core2/world-legislating-federal.test.ts

**Notes.** Oct 20 (pool feeder): part 4 of 4 of gov-stopgap-world-legislating-missing-mechanic.
