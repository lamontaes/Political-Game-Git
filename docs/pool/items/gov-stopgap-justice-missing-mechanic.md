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
standard: 2
lead: governing
model: opus
effort: high
root: rc7-player-cannot-drive
source: "src/core2/data/stopgaps.json, src/core2/modules/justice.ts, kind missing-mechanic"
claimed-at:
checked: fable 2026-11-10
---

**What.** Replace SG-GOV-justice-player-choices in src/core2/modules/justice.ts. Today considerReport and the plea step (pleaOn, around line 655) decide for the player's character from their traits like anyone else's, so the player never chooses to report a bribe or to plead. Add a choices table to the justice module the way the legislature keeps its vote choices (table choices, read where the body decides): when the reporter or defendant is the controlled person (snapshotExplicitControlV1(api.state).personId or state.playerId), the engine writes an open offer with a deadline and the director shows it in the hearing or the moment of knowing; the player's pick is written as a choice row, and the engine reads that row at the decision. With no choice by the deadline, the player is not reported for and does not plead, the engine never decides for the player; every other person keeps the trait-weighed rule. Seen: a scene that offers the player the choice to report a bribe or to plead, instead of the engine choosing for the player's character.

**Cause.** Found in code: src/core2/modules/justice.ts lines 770-771 (SG-GOV-justice-player-choices, open in src/core2/data/stopgaps/gov.json): considerReport and the plea step decide for the controlled person from their traits like anyone else's.

**Fix.** For the controlled person, write an open offer with a deadline, read the player's pick as a choice row at the decision, and never decide for the player on no pick. Other people keep the trait-weighed rule. Resolve the row.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** No hand-written player text: the offer, the hearing and the verdict are worded by the English engine, and the screen shows record data and control names. Replace, never layer: the trait-decided plea and report for the player are deleted, and only non-player people use pleaOn and reportReasons. An effect is a read, not a record: the choice row is read by considerReport and the case step the day they decide. The chain is the acceptance: the offer, the pick, the case record, the sentence and the director's scene are all named by record id. No dice: a non-player defendant still weighs the plea from their own traits and the evidence.

**Done when.** A second session, in a one-year run of the played world (buildBenchWorld, every module installed) in a place drawn from all 56 with a seed the builder did not choose, finds a case against the player's character showing an open plea offer, the player's choice row, and a trial or conviction that follows the pick, each by record id with the director scene; src/core2/justice-player.test.ts proves it and SG-GOV-justice-player-choices is resolved in src/core2/data/stopgaps/gov.json.

**Waits on.** Nothing (words-justice-hearing-verdict-bank is done).

**Files.** src/core2/modules/justice.ts, src/core2/player-control-state-v1.ts, src/director/hearing-scenes.test.ts, src/core2/justice-player.test.ts, src/core2/data/stopgaps/gov.json

**Notes.** First row: The player's report and plea are decided by the character's own traits and the case's reads, like anyone else's, instead of being offered to the player.

Oct 20 (pool feeder): spec written; the other row, SG-GOV-justice-no-forfeiture, is already resolved (Oct 15, forfeiture first then fine), so this item is the player-choices row only. CTO call recommended: no pick by the deadline means no plea and no report (the engine never acts for the player; owner Oct 13 on the ballot, and the legislature's abstain-without-choice). It waits on words-justice-hearing-verdict-bank so the scenes are worded.
