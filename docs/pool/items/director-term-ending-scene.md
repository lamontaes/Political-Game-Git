---
id: director-term-ending-scene
title: "A term ending is a scene, and for the player's own seat it opens the campaign or filing screen"
area: director
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after: director-signing-staff-and-press
blocked-on:
lead: director
model: opus
effort: medium
root: design-director-on-core2
source: split from words-director-watches-officeholders by pool feeder Oct 20
checked: fable 2026-11-10
---

**What.** The offices engine records when a term ends (`TermRow.endDate`), when a seat is vacated (`seat-vacated`) and when its next holder takes it (`inauguration`, `took-office`), and nothing stages the ending. Build circumstance rows that read these through the shared officeholder reader and stage a farewell or handover for the outgoing and incoming holders, with staff and press. When the player's own term ends and the seat is on the ballot, the scene ends with the existing campaign or filing screen opened from the control data, never a new screen; an ending the player loses or leaves opens the journal instead. Seen: a farewell or handover scene when a term ends, which opens the campaign or filing screen when your own seat is up (golden path).

**Cause.** Design: docs/design/director-on-core2.md and the Oct 27 look-first correction in this item's Notes (circumstance rows on the seat-vacated and took-office records, no graded hold). The end date is read from the term record (`TermRow.endDate`, `src/core2/modules/offices.ts`) because SG-GOV-term-end-estimate (`src/core2/data/stopgaps/gov.json`) is still an estimate. `src/director/term-ending-scene.test.ts` was never written and `src/director/officeholder-records.ts` is gone.

**Fix.** Add circumstance rows on the offices engine's term-end and vacancy records that stage a farewell or handover with staff and press. When the player's own seat is on the ballot the scene ends by opening the existing filing or campaign screen from `src/bench/data/controls.json`. An ending the player loses or leaves opens the journal. Missing graded sentences are registered as a Words-line pool item and the scene stays out of play until graded.

**Time box.** 6 hours for one Opus session.

**Rules.** No hand-written player text: the farewell, handover and screen controls come from the English engine and control data. An effect is a read, not a record: the scene appears because the director reads the term and vacancy records when scheduling. Ask why: each line cites the term id and the election result it follows. One rule, all 56 places: no office named in code; the term length and next step come from the record. Replace, never layer: reuse the screen opener, add no second term tracker.

**Done when.** A second session plays a year of buildBenchWorld in a drawn place (place and seed written down) in which a term's end date falls, and finds an ending scene staged that cites the term id. When the player's seat is on the ballot the scene ends by opening the filing or campaign screen. `src/director/term-ending-scene.test.ts` proves it with the place and seed named, and a line with no graded sentence is held back.

**Waits on.** Nothing. The line is graded by Words; a scene with no graded sentence is held back, not blocked.

**Files.** src/director/data/circumstances.json, src/director/circumstance.ts, src/director/scheduling.ts, src/core2/modules/offices.ts, src/bench/data/controls.json, src/director/term-ending-scene.test.ts (new)

**Notes.** Oct 20 (pool feeder): spec written; the termEnd date is still an estimate (SG-GOV-term-end-estimate), so read it from the term record and do not recompute it. Part 3 of 3 for words-director-watches-officeholders.

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): correct the item: drop the hold, circumstance rows (seat-vacated / took-office records).
