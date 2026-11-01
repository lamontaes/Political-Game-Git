---
id: gov-record-vote-per-question
title: "A member's record keeps their vote on every question of a multi-part bill, not only the last"
area: gov
kind: bug
priority: 1
size: S
status: claimed
claimed-by: governing/record-vote-per-question
pr:
blocked-on:
lead: governing
source: governing lead, Nov 1 (phase B map)
claimed-at: 2026-11-01T14:39:10.340Z
---

**What.** recordVote (src/core2/modules/record.ts:74) builds a vote record id from the measure and the person only, and the roll call (src/core2/modules/legislature.ts:3493-3506) calls it once per provision with the bill's number as the measure. So on a bill with two provisions the second record overwrites the first, and its vote-recorded event is dropped because an event with that id already happened (state.ts:2119). promisesOf, which judges a promise by its question, then sees only the last question, and a later bill that reuses a number (Congress numbers H.R. 25 again each Congress) overwrites an older member's record.

**Rules.** One record per member per question per bill: key the id by the bill's id and the question, never the bill's number. One rule, all 56 places: the test draws its place from all 56 and prints the place and seed. Replace, never layer: every writer and reader of the old id shape (src/core2/past-laws.ts:215, src/bench/reached.ts:184) moves in the same change.

**Done when.** In a drawn place with its seed printed, a bill with two provisions that comes to a roll call leaves two record vote rows per voting member, one per question, each by its own id; each row's vote-recorded event exists by id; promisesOf judges a promise on the first question by that row's id; a second bill with the same number leaves the first bill's rows in place.

**Files.** src/core2/modules/record.ts, src/core2/modules/legislature.ts, src/core2/past-laws.ts, src/bench/reached.ts, src/core2/record-vote-per-question.test.ts

**Notes.** Found by the phase B map (Nov 1, 14:18 UTC, docs/work-orders/governing-2026-10-29/06-phase-b-units.md unit 4). bench/reached.ts is the lane's file: ask the lane before changing it.
