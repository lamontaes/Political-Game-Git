---
id: director-office-fact-lowercased-but-test-expects-the-title
title: "The filing scene's office fact is lowercased and its test expects the record's capitalized title"
area: director
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
after:
source: Gate of pull request 9512, Nov 16 (purpose-scenes red at Onida SD, also red on clean 892427ec)
lead: words
standard: 2
model: sonnet
effort: medium
root: none
---

**What.** src/director/purpose-scenes.test.ts fails with "expected 'council member' to be 'Council member'" in the family-filing scene.
Seen: Onida SD, seed 32676d7b87d0bf96:1, filing …council:0:2025-04-01:person_009c3b8fe0f4b824, red on clean 892427ec with the same seed and message.

**Cause.** Found in code: src/director/purpose-scene.ts sets the `office` fact from `race.title.toLowerCase()` (line 2048) and the `post` fact from `post.title.toLowerCase()` (line 2932), so a title sits mid-sentence in lowercase, while the test at lines 150 and 152 compares the fact to the contest's own title, which is capitalized. The Journal's #9119 fix lowercases only the Journal's own office fact and does not cover this.

**Fix.** Decide by the line: the slot text is read mid-sentence, so the test compares to the lowercased title and the capitalized record stays the record's; if any bank piece starts a sentence with the fact, that piece reads it through the capitalizing slot form instead. No second title rule is written.

**Time box.** 2 hours for a Sonnet session.

**Rules.** One title function: the engine's lowercasing is the single place a title changes case.

**Done when.** A second session sees, at a place drawn from all 56 (name the place and seed) and again at Onida SD seed 32676d7b87d0bf96, that src/director/purpose-scenes.test.ts passes, and that a family-filing scene for a council candidate says the office in lowercase mid-sentence and capitalized at a sentence start.

**Waits on.** Nothing.

**Files.** src/director/purpose-scenes.test.ts, src/director/purpose-scene.ts

**Notes.** Filed Nov 16 by hand on the 9512 branch. The Journal thread confirmed #9119 does not cover it.
