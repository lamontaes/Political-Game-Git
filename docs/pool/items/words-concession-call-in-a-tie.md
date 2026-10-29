---
id: words-concession-call-in-a-tie
title: "In a tied race the runner-up's call has no line for how the tie was settled, and the concession test fails"
area: words
kind: bug
priority: 2
size: S
lead: words
status: in-pr
claimed-by: words/concession-tied-count
pr: #6749
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-29T06:06:22.226Z
---

**What.** In Nashville, Ohio (3953634), run seed 62c54aceac792551 of src/director/concession-received.test.ts, the council race tied 1 to 1 and the state's law settled it by a drawing (the elections engine's tie record tie:<contest>). Nobody finished ahead, so the scene has no lead, and the winner's answer to the caller's question about the count has no line (bank gap concession-received/reply/answer after ask); the test also read a lead it assumed. CI drew that seed on PR 6744.

**Rules.** Ask why: the lines say how the tie was settled from the tie record (a drawing, or a board's or legislature's vote), never a margin no count holds. One rule, all 56 places: the scene fits every state's tie law the engine applies.

**Done when.** concession-received.test.ts passes with run seed 62c54aceac792551 in Nashville, Ohio and with a seed whose race has a margin; in the tie the scene names how it was settled from the tie record by id, says no lead, and lists no bank gap.

**Files.** src/director/purpose-scene.ts, data/english/parts/scene-talk.json, src/director/concession-received.test.ts

**Notes.** TODO
