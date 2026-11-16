---
id: director-seated-at-large-candidate-gets-a-lost-race-scene
title: "A candidate the count seated in an at-large race is not told they lost"
area: director
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
after:
source: Pinned test for pull request 9512 at Walled Lake MI (seed losscan:25), Nov 15
lead: words
standard: 2
model: sonnet
effort: medium
root: none
---

**What.** In a three-seat council race a candidate who finished second, inside the seats, was given the "you lost the race" narration ("by 1 vote") and the concession call.
The count had seated them, so the player is told someone lost who won a seat.
The same causes serve every at-large body, so the fault is not one town's.
Seen: Walled Lake MI, seed losscan:25, a filer with 215 votes against a last winning seat of 200.

**Cause.** Found in code: the `race-lost` and `family-loss` causes in src/director/data/situation-types.json match on `winnerId` being someone else, and an at-large race names one winner while the count seats several; the result record's `outIds` names who missed the cut.

**Fix.** Match those two causes on `outIds` including the subject, as the primary-result causes already do. A first try at this made the night scene in src/bench/election-day.test.ts fail with "Not a reply the scene offers", so the builder reads why that test's loser is not in `outIds` before changing the match.

**Time box.** 2 hours for a Sonnet session.

**Rules.** Replace, never layer: the count's own list of who missed the cut decides who lost, and no second lost-race rule is written beside it.

**Done when.** A second session sees, in the running game at a place drawn from all 56 (name the place and seed), that a candidate the count seated in an at-large race gets no lost-race scene or concession call. At Walled Lake MI seed losscan:25 the played world no longer names a seated filer in the played file, and the test src/bench/election-day.test.ts and the test src/director/family-loss-stake-scene.test.ts pass.

**Waits on.** Nothing.

**Files.** src/director/data/situation-types.json, src/director/family-loss-stake-scene.test.ts

**Notes.** Filed Nov 15 by hand with pull request 9512. The scene and the cause match are on the Train already; 9512 does not touch them. The played proof is the played file of scripts/words/family-loss-played.ts, which names the seated candidate at Walled Lake MI (seed losscan:25), and the pinned gate test plays Pomeroy WA, where one seat is filled and the case does not arise.
On the current Train a seated filer at Poplar Plains CT (seed losscan:34) gets no family-loss scene, and the pinned test asserts it there; whether Walled Lake MI (losscan:25) is fixed too is not yet shown, so the second session checks it first and closes this item if it is. The narration's "by 1 vote" wording at a gap of 0 votes belongs to the same check.
