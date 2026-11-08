---
id: words-chair-announces-the-vote
title: "A council or floor chair says "The motion carries." when a vote ends"
area: words
kind: wiring
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
lead: words
source: story/restore-liked-lines, Nov 8 (a rewrite never deletes a line the owner graded good)
claimed-at:
---

**What.** The owner graded the chair's line "The motion carries." good (batch 9, Oct 14), and it sits in data/english/parts/address.json under stopgap SG-WORDS-address-no-reader with nothing reading it. No scene has a chair who speaks: the floor-debate scene only narrates "The chair recognizes {name}", and the bill paper words a result in writing. Give the council meeting or floor a chair turn after the roll that announces the recorded result in the chair's own words, with this piece for a passed question.

**Time box.** Three hours for one Sonnet session.

**Rules.** No hand-written player text: the words come from the bank piece address.chair-run-meeting.the-motion-carries, and a failed question needs its own piece. Wire to the world: the chair's line reads the bill's recorded roll, never a typed result. Ask why: the scene cites the vote record it announces.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn place from all 56, named with its seed, a bill that passes on a recorded roll has a chair turn that says "The motion carries." and cites the vote record id, and a bill that fails does not; a test beside src/director/scene-talk.test.ts proves it, and the owner plays it: sit at a council vote and hear the chair call it. Then delete SG-WORDS-address-no-reader.

**Files.** data/english/parts/address.json, src/director/data/situation-types.json, src/director/purpose-scene.ts, src/director/scene-talk.test.ts

**Notes.** Added Nov 8 by the Story session with the restore of the owner's liked lines (`scripts/dialogue-batch/liked-lines-kept.test.ts`). The graded keys stay in a bank until a scene reads them.
