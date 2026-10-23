---
id: words-grading-page-batches-21-22
title: "One grading page for batches 21 and 22: every line, its move, its context, and a yes or no"
area: words
kind: feature
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: "CTO weekend leads, Oct 24 (PR cto/leads-2026-10-24)"
---

**What.** The owner ruled on Oct 24 that batches 21 and 22 are graded on one page, never in chat. Build one page that lists every line of both batches with the move it makes, its context (the scene, the speaker, and the records each slot reads, with ids) and a yes or no control for each line. The page writes the grades to the files `apply-grades` reads, so a yes can be released and a no is never said. Batch 22 is in review (`words-batch-22`); batch 21 rides the word pack branch.

**Rules.** No hand-written player text: the page shows bank parts and composed lines exactly as the engine makes them; the builder words nothing. Ask why: each line's context names the records its slots read, by id, so the owner grades what a player would see and why. Grade by move (owner, Oct 15).

**Done when.** The page opens in the bench or as one file under `docs/grading/`, lists every batch 21 and batch 22 line with move, context and record ids, a test shows a yes and a no written by the page reaching the part ledger through `scripts/dialogue-batch/apply-grades.ts` against their one part each, and a screenshot of the page is in the PR body.

**Files.** scripts/dialogue-batch/grading-bench.ts, scripts/dialogue-batch/apply-grades.ts, docs/grading/

**Notes.** Owner ruling, Oct 24. Order: `docs/work-orders/words-grading-page-2026-10-24.md`. A PR names this item on line 1 and `Lead: words` in its body.
