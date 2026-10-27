---
id: director-officeholder-address-scene
title: "An officeholder's address is a speech scene: the audience, the room and the speaker's moves come from the speech and office-day records"
area: director
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
after:
blocked-on:
source: split from words-director-watches-officeholders by pool feeder Oct 20
---

**What.** When an officeholder gives an address (the office-day act `state-of-the-city`, or any speech the speech engine records as `speech.heard` with its `audienceIds`), the director should stage it as a speech scene. Build the producer in src/director that reads the speech record (speaker, place, topic, audience) and the office record (`took-office` or `TermRow`) and creates a moment of a new `address` situation type in src/director/data/situation-types.json: the speaker holds the floor, the audience are the listed people and the press reporter, and the moves come from the type's rows. Add a shared officeholder-record reader (src/director/officeholder-records.ts) that the signing and term-ending parts reuse. The words come from the mined bank (data/english/parts/address.json and the scene bank); where no graded sentence covers the new type, register a Words-line pool item for mining it and keep the scene out of play until graded.

**Rules.** No hand-written player text: every line comes from the English engine's mined bank, never from the producer or a screen. An effect is a read, not a record: the scene exists only because the director reads the speech record when it schedules a moment. Ask why: each line cites the speech record id and the office record. One rule, all 56 places: no office or place is named in code; the setting and audience come from the record. Replace, never layer: use the existing situation-type and scheduling structures, no separate address log.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a place drawn from all 56 with a seed the builder did not choose, an officeholder's `speech.heard` record produces an address moment whose audience ids equal the record's `audienceIds`, each cited by record id, and the scene stays unplayed (not shippable) if the bank has no graded sentence; proven in src/director/officeholder-address-scene.test.ts with place and seed named.

**Files.** src/director/officeholder-records.ts, src/director/data/situation-types.json, src/director/scheduling.ts, src/director/civic-roles.ts, src/core2/modules/speech.ts, src/core2/modules/office-day.ts

**Notes.** Oct 20 (pool feeder): spec written; civic-roles.ts already reads a speech's listeners (`retellingsOf`), and situation-types.json has no address type yet. Part 1 of 3 for words-director-watches-officeholders.
