---
id: words-batch-files-out-of-repo
title: Decide whether graded batch JSON belongs in the repository
area: words
kind: cleanup
priority: 3
size: S
status: in-pr
claimed-by: claude/batch-files
pr: #5105
after:
blocked-on:
milestone:
source: acting CTO, Oct 16, from PR #4459
claimed-at: 2026-10-19T19:06:50.473Z
---

**What.** The graded batch pages `data/english/batches/batch-12.json`, `batch-13.json` and `batch-14.json` are about 490,000 lines together. They are most of PR #4459's weight and most of its conflict risk. Decide whether graded batch JSON belongs in the repository at all once the owner has graded it, or whether only the Markdown in `docs/grading/` and the pieces that reached `data/english/parts/` should stay. This is a question for the Words session, not the owner.

**Rules.** No dice; one rule, all places: the repository keeps what the game reads and what the owner reads, and nothing it can regenerate or that only inflates merges.

**Done when.** A written decision in this item's Notes says which batch files stay in the repository, which move out, and why. Any file removed is removed in one PR, and PR #4459 merges without the batch JSON conflicts.

**Files.** `data/english/batches/`.

**Notes.** Raised by the acting CTO on Oct 16 while ruling merge order for PR #4459.

**Decision (Oct 19, Claude session, checked against main).** Graded batch JSON does not belong in the repository once the owner's grades are folded into `data/english/part-grades.json`.

- **Stays:** `data/english/part-grades.json` (the ledger the game's grade reader uses, and the only record of the owner's grades), the pieces that reached `data/english/parts/`, and the Markdown pages in `docs/grading/` the owner reads.
- **Moves out:** every `data/english/batches/batch-<n>.json` once its id is in the ledger's `batches` list. Evidence it is safe: `tests/source/data-shipping.test.ts` lists `data/english/batches` and `data/english/grades` as NOT_SHIPPED authoring records, and `withKept` in `scripts/dialogue-batch/apply-grades.ts` exists to keep grades from batches whose files were deleted after folding. The ledger lists batch-1, batch-2, batch-7, batch-9-relayed and batch-9 today, but batch-7.json and batch-9.json are not removable yet: their grade files need them, and deleting both drops the per-kind graded counts in data/english/coverage.json (found Oct 19; see words-coverage-graded-counts-kept); batches 6, 10, 11, 12-staged and the two named ones wait for the owner's grades.
- **PR #4459:** batches 12, 13 and 14 (about 490,000 lines) should not merge as JSON. The Words session folds them into the ledger and the Markdown pages, then drops the JSON from that PR so it stops conflicting. That edit is on #4459's branch, which I may not push to.

Follow-ups: words-batch-files-delete-folded for the removable files on main.
