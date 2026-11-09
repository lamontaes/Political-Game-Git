---
id: words-hearing-chair-title-and-yes
title: "A hearing chair is addressed by title and answers a yes"
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

**What.** Three lines the owner graded good sit in data/english/parts/hearing.json under stopgap SG-WORDS-hearing-no-reader: "Thank you, Chairman.", "Thank you, Mr. Chairman." and "Yes, thank you.". The hearing-testify scene carries no fact for the chair's title, so a title line would say Chairman to any chair, and none of the chair's questions is a yes-or-no one. Add a chair-title fact from the chair's office record and a chair question that a yes answers, and read the three pieces from the scene.

**Time box.** Three hours for one Sonnet session.

**Rules.** Wire to the world: the title comes from the chair's recorded seat and person, never typed per place. One rule, all 56 places: no state, city or GEOID in logic. No hand-written player text: the lines are the bank pieces hearing.thanks.thank-you-chairman, hearing.thanks.thank-you-mr-chairman and hearing.answer.yes-thank-you.

**Done when.** In a drawn place from all 56 (name and seed in the PR body) a hearing-testify scene with a male chair can say "Thank you, Mr. Chairman.", one with a woman chair never does, and a chair question that a yes answers plays "Yes, thank you."; a test beside src/director/hearing-scenes.test.ts names the scene and record ids. Then delete SG-WORDS-hearing-no-reader.

**Files.** data/english/parts/hearing.json, src/director/purpose-scene.ts, src/director/data/purpose-arcs.json, src/director/hearing-scenes.test.ts

**Notes.** Added Nov 8 by the Story session with the restore of the owner's liked lines (`scripts/dialogue-batch/liked-lines-kept.test.ts`). The graded keys stay in a bank until a scene reads them.
