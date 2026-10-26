---
id: director-term-ending-scene
title: "A term ending is a scene, and for the player's own seat it opens the campaign or filing screen"
area: director
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
after: director-signing-staff-and-press
blocked-on:
source: split from words-director-watches-officeholders by pool feeder Oct 20
---

**What.** The offices engine records when a term ends (`TermRow.endDate`), when a seat is vacated (`seat-vacated`) and when its next holder takes it (`inauguration`, `took-office`). Build the director producer that reads these through the shared officeholder reader and stages a farewell or handover scene for the outgoing and incoming holders, with staff and press. Some endings need a choice from the player: when the player's own term ends and the seat is on the ballot, the scene ends with the existing campaign or filing screen opened from the control data (src/bench/data/controls.json), never a new screen. An ending the player loses or leaves opens the journal instead. Missing graded sentences are registered as a Words-line pool item and the scene stays out of play until graded.

**Rules.** No hand-written player text: the farewell, handover and screen controls come from the English engine and control data. An effect is a read, not a record: the scene appears because the director reads the term and vacancy records when scheduling. Ask why: each line cites the term id and the election result it follows. One rule, all 56 places: no office named in code; the term length and next step come from the record. Replace, never layer: reuse the screen opener, add no second term tracker.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a place drawn from all 56 with a seed the builder did not choose, a term whose end date falls in the run stages an ending scene citing the term id, and a player's seat on the ballot ends it by opening the filing or campaign screen, proven in src/director/term-ending-scene.test.ts with place and seed named and held back where a line has no graded sentence.

**Files.** src/director/officeholder-records.ts, src/director/data/situation-types.json, src/director/scheduling.ts, src/core2/modules/offices.ts, src/bench/data/controls.json

**Notes.** Oct 20 (pool feeder): spec written; the termEnd date is still an estimate (SG-GOV-term-end-estimate), so read it from the term record and do not recompute it. Part 3 of 3 for words-director-watches-officeholders.
