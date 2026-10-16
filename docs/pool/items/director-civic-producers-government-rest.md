---
id: director-civic-producers-government-rest
title: "Appointments, recalls, hearings, press interviews, scandals and a law reaching a person fire as scenes"
area: director
kind: wiring
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Six civic scene types still wait on a producer: an appointment (`economy.board-appointment`), a recall (`recall-petition`), a public hearing (the legislature's hold-hearing decision), a press interview (`press-approached`), a scandal reaching the person (`press.exposed`) and a law reaching a person (`law.effect-learned`). Floor votes, signings and vetoes already fire (director-civic-producers-government). For each, give the director a moment for the person the record reaches (an event impact in `src/director/data/director.json`), replace the `awaitingProducer` mark in `src/director/data/situation-types.json` with a match on the record, and bind its roles from the records (the civic fills in `src/director/civic-roles.ts`). Where the core writes only a decision and no event (the hearing), the legislature emits the event first.

**Rules.** No dice: a scene fires from a recorded cause, never a roll, and a quiet day fires nothing. The chain is the acceptance: each fired scene is traced from its cause record to the scene to the journal line. One rule, all 56 places: a random place and seed from all 56, named. Speed: the ledger acts on the day a record is written, never by scanning the world each day. Replace, never layer: each `awaitingProducer` mark is deleted in the same change.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, each of the six types fires for a named person from a named record, shown by a test beside `src/director/government-scenes.test.ts`, or names a real reason in that year. The owner plays it: he is appointed, recalled or exposed and the scene opens.

**Files.** src/director/data/director.json, src/director/data/situation-types.json, src/director/civic-roles.ts, src/core2/modules/legislature.ts, src/director/government-scenes.test.ts

**Notes.** Split out of director-civic-producers-government when floor votes, signings and vetoes were built.
