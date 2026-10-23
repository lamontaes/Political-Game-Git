---
id: words-batch-22
title: "Batch 22: the 141 held hand-written lines, by move, for the owner to grade"
area: words
kind: feature
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The words-authored-parts-shippable-sweep holds the 141 hand-written lines in the English engine's banks until the owner grades them. Build batch 22 as a grading page that shows each held line by bank and move, with every slot it fills and where that slot's value comes from in the records. The batch file must fold into the part ledger through apply-grades, so a line graded good can be released and a line graded bad is never said.

**Rules.** Grade by move (owner, Oct 15, evening): one grade carries to every scene that uses the line's move, so lines are grouped by move with their slots shown. No hand-written player text: the page shows bank parts as written and the builder words nothing.

**Done when.** docs/grading/words-batch-22.md and data/english/batches/batch-22.json list all 141 held lines, and a test shows a grade on a batch item reaching the part ledger against that one part.

**Files.** scripts/dialogue-batch/held-parts-batch.ts, scripts/dialogue-batch/held-parts-batch.test.ts, data/english/batches/batch-22.json, docs/grading/words-batch-22.md

**Notes.** TODO
