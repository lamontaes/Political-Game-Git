---
id: words-batch-files-delete-folded
title: "Delete the graded batch files whose grades are already in the ledger"
area: words
kind: cleanup
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: decision in words-batch-files-out-of-repo
---

**What.** `data/english/part-grades.json` lists batch-1, batch-2, batch-7, batch-9-relayed and batch-9 as folded, yet batch-7.json and batch-9.json are still in `data/english/batches/`. Delete those two files, and each batch file later once its id is in the ledger. The grade reader keeps their grades through `withKept`.

**Rules.** Replace, never layer: the folded file is removed in the same change that the ledger holds its grades. No dice.

**Done when.** `npm run` for the grade fold in scripts/dialogue-batch/apply-grades.ts gives the same ledger before and after the deletion, and tests/source/data-shipping.test.ts passes.

**Files.** data/english/batches/batch-7.json, data/english/batches/batch-9.json

**Notes.** From the decision in words-batch-files-out-of-repo, Oct 19.
