---
id: words-chair-announces-the-vote
title: "A council or floor chair says "The motion carries." when a vote ends"
area: words
kind: wiring
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: design-director-on-core2
source: story/restore-liked-lines, Nov 8 (a rewrite never deletes a line the owner graded good)
claimed-at:
checked: fable 2026-11-10
---

**What.** The owner graded the chair's line "The motion carries." good (batch 9, Oct 14), and it sits in data/english/parts/address.json under stopgap SG-WORDS-address-no-reader with nothing reading it. No scene has a chair who speaks: the floor-debate scene only narrates "The chair recognizes {name}", and the bill paper words a result in writing. Give the council meeting or floor a chair turn after the roll that announces the recorded result in the chair's own words, with this piece for a passed question.

**Cause.** Found in code: data/english/parts/address.json holds the graded chair line address.chair-run-meeting.the-motion-carries ('The motion carries.') and src/director/data/stopgaps.json (line 604) holds SG-WORDS-address-no-reader; no scene reads it, and the floor-debate scene only narrates 'The chair recognizes {name}'.

**Fix.** Add a chair turn after the recorded roll in the council or floor scene that says the bank piece for a passed question, and its own piece for a failed one (Story writes that piece; every line in data/english/parts/ is Story's, owner's ruling of Nov 10), citing the vote record id; then delete SG-WORDS-address-no-reader.

**Time box.** 3 hours for one Sonnet session.

**Rules.** No hand-written player text: the words come from the bank piece address.chair-run-meeting.the-motion-carries, and a failed question needs its own piece. Wire to the world: the chair's line reads the bill's recorded roll, never a typed result. Ask why: the scene cites the vote record it announces.

**Done when.** A second session plays a one-year run of buildBenchWorld in a drawn place from all 56 (place and seed named) and sees a bill that passes on a recorded roll get a chair turn saying 'The motion carries.' with the vote record id, and a bill that fails get its own failed-question line and not that one; a test beside src/director/scene-talk.test.ts proves it, and SG-WORDS-address-no-reader is deleted.

**Waits on.** Nothing.

**Files.** data/english/parts/address.json, src/director/data/situation-types.json, src/director/purpose-scene.ts, src/director/scene-talk.test.ts, src/director/data/stopgaps.json

**Notes.** Added Nov 8 by the Story session with the restore of the owner's liked lines (`scripts/dialogue-batch/liked-lines-kept.test.ts`). The graded keys stay in a bank until a scene reads them.
