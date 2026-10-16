---
id: words-batch-files-out-of-repo
title: Decide whether graded batch JSON belongs in the repository
area: words
kind: cleanup
priority: 3
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
milestone:
source: acting CTO, Oct 16, from PR #4459
---

**What.** The graded batch pages `data/english/batches/batch-12.json`, `batch-13.json` and `batch-14.json` are about 490,000 lines together. They are most of PR #4459's weight and most of its conflict risk. Decide whether graded batch JSON belongs in the repository at all once the owner has graded it, or whether only the Markdown in `docs/grading/` and the pieces that reached `data/english/parts/` should stay. This is a question for the Words session, not the owner.

**Rules.** No dice; one rule, all places: the repository keeps what the game reads and what the owner reads, and nothing it can regenerate or that only inflates merges.

**Done when.** A written decision in this item's Notes says which batch files stay in the repository, which move out, and why. Any file removed is removed in one PR, and PR #4459 merges without the batch JSON conflicts.

**Files.** `data/english/batches/`.

**Notes.** Raised by the acting CTO on Oct 16 while ruling merge order for PR #4459.
