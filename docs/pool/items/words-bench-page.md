---
id: words-bench-page
title: "The batch-12 grading page shows each scene as the game would, with the owner's ten rulings kept"
area: words
kind: feature
priority: 1
size: S
status: claimed
claimed-by: claude/words-bench-page
pr:
blocked-on:
after: words-bench-datapoints
source: added with npm run pool -- add
claimed-at: 2026-10-19T23:11:02.771Z
---

**What.** Render `docs/grading/words-batch-12.md` from the batch data: each item as the game would show it, the narrator's paragraph, then the lines with speaker names, then the four replies and the lies, with a small footer of the feature row under each item. The top of the page lists the items dropped and the situations skipped, with reasons. The page keeps the owner's ten batch-12 rulings (Order 2 section 7 of `docs/work-orders/words-and-director-2026-10-15.md`): state each scene's endpoint, open with a narrator paragraph of a few sentences, replies that continue the conversation, journal lines with their subject, staged speeches, a bill's text beside its real name, lies that name another place, no dates in speech, no say-nothing row, and no school, workplace, notice or public hearing scene until something new is said in it. The CTO builds the grading artifact from the Markdown.

**Rules.** No hand-written player text: every word comes from the English engine's banks in `data/english/parts/`, nothing is typed into code or a screen; no dice: profiles vary by traits, never a roll; one rule, all 56 places: the place is drawn from all 56 and named; American English (`npm run spelling`); speed: the bench reuses one cached world and adds no new world run. Ask why: the footer of each item gives the feature row, not the other way round.

**Done when.** Running the bench on a cached year in a place drawn from all 56 (name it and the seed) writes `docs/grading/words-batch-12.md` with at least 150 items sorted so adjacent items differ in situation type and register, and a test in `scripts/dialogue-batch/` fails if a page has a date in speech, a bare "All right" reply, a say-nothing row or a raw record id.

**Files.** scripts/dialogue-batch/grading-bench.ts, docs/grading/words-batch-12.md (new), scripts/dialogue-batch/grading-batch.ts

**Notes.** Part of words-grading-bench. The owner grades thirty different moments from this page.
