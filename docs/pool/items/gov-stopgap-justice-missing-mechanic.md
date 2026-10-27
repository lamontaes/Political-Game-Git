---
id: gov-stopgap-justice-missing-mechanic
title: "Stopgaps in justice (missing-mechanic): 2 open"
area: gov
kind: stopgap
priority: 3
status: open
claimed-by:
pr:
blocked-on:
milestone:
after: words-justice-hearing-verdict-bank
size: M
source: "src/core2/data/stopgaps.json, src/core2/modules/justice.ts, kind missing-mechanic"
claimed-at:
---

**What.** Replace SG-GOV-justice-player-choices in src/core2/modules/justice.ts. Today considerReport and the plea step (pleaOn, around line 655) decide for the player's character from their traits like anyone else's, so the player never chooses to report a bribe or to plead. Add a choices table to the justice module the way the legislature keeps its vote choices (table choices, read where the body decides): when the reporter or defendant is the controlled person (snapshotExplicitControlV1(api.state).personId or state.playerId), the engine writes an open offer with a deadline and the director shows it in the hearing or the moment of knowing; the player's pick is written as a choice row, and the engine reads that row at the decision. With no choice by the deadline, the player is not reported for and does not plead, the engine never decides for the player; every other person keeps the trait-weighed rule.

**Rules.** No hand-written player text: the offer, the hearing and the verdict are worded by the English engine, and the screen shows record data and control names. Replace, never layer: the trait-decided plea and report for the player are deleted, and only non-player people use pleaOn and reportReasons. An effect is a read, not a record: the choice row is read by considerReport and the case step the day they decide. The chain is the acceptance: the offer, the pick, the case record, the sentence and the director's scene are all named by record id. No dice: a non-player defendant still weighs the plea from their own traits and the evidence.

**Done when.** In a one-year run of the played world (buildBenchWorld, every module installed) in a place drawn from all 56 with a seed the builder did not choose, a case against the player's character shows an open plea offer, the player's choice row, and a trial or a conviction that follows the pick, each by record id with the director scene; src/core2/justice-player.test.ts proves it and SG-GOV-justice-player-choices is resolved in src/core2/data/stopgaps.json.

**Files.** src/core2/modules/justice.ts, src/core2/player-control-state-v1.ts, src/director/hearing-scenes.test.ts, src/core2/justice-player.test.ts, src/core2/data/stopgaps.json

**Notes.** First row: The player's report and plea are decided by the character's own traits and the case's reads, like anyone else's, instead of being offered to the player.

Oct 20 (pool feeder): spec written; the other row, SG-GOV-justice-no-forfeiture, is already resolved (Oct 15, forfeiture first then fine), so this item is the player-choices row only. CTO call recommended: no pick by the deadline means no plea and no report (the engine never acts for the player; owner Oct 13 on the ballot, and the legislature's abstain-without-choice). It waits on words-justice-hearing-verdict-bank so the scenes are worded.
