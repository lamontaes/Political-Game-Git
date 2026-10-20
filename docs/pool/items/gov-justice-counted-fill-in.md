---
id: gov-justice-counted-fill-in
title: "A counted adult filled in matches their group's case and custody counts"
area: gov
kind: feature
priority: 3
size: S
status: open
claimed-by:
pr:
after: gov-justice-counted-dispositions
blocked-on:
milestone:
source: split from gov-justice-counted-cases by pool feeder Oct 20
---

**What.** When the player meets or clicks a counted adult and the core fills them in as a full person, make their justice record match what the group already says. If the group row shows 3 people serving a sentence, 2 awaiting trial and 11 with a past conviction, the filled-in member is assigned one of those states by their own id (seeded, the same person every time), and their case, sentence and custody rows are written from the group's case rows with the law, dates and charge already recorded; a member the group counts as never charged gets no case.

**Rules.** One model, two tiers: a filled-in person is a consistent member of their group, so the group's counts are decremented as members are assigned and never exceed what the group row says. No dice: the assignment is a seeded read of the member's id against the group's counts, which is seeded generation of who they are, never a later outcome. Replace, never layer: use the core's fill-in hook (core-fill-in-hook) and add no second fill-in path. Ask why: the filled-in case cites the group case row id it came from.

**Done when.** In a one-year run of the played world (buildBenchWorld, every module installed) in a place drawn from all 56 with a seed the builder did not choose, filling in every member of one counted group yields exactly the group's counted numbers of people in custody, awaiting trial and previously convicted, each citing its group case row id; src/core2/justice-counted.test.ts proves it.

**Files.** src/core2/justice-counted.ts, src/core2/modules/justice.ts, src/core2/counted-groups.ts, src/core2/justice-counted.test.ts

**Notes.** Oct 20 (pool feeder): part 3 of 3 of gov-justice-counted-cases. Uses the same hook the other fill-in items extend (core-fill-in-hook).
