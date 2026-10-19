---
id: words-batch-files-delete-folded
title: "Delete the graded batch files whose grades are already in the ledger"
area: words
kind: cleanup
priority: 3
size: S
status: claimed
claimed-by: claude/batch-delete
pr:
blocked-on:
after: words-coverage-graded-counts-kept
source: added with npm run pool -- add
claimed-at: 2026-10-19T19:18:12.900Z
---

**What.** `data/english/part-grades.json` lists batch-1, batch-2, batch-7, batch-9-relayed and batch-9 as folded, yet batch-7.json and batch-9.json are still in `data/english/batches/`. Delete them with their grade files once the coverage table no longer needs them, so the folded batches stop weighing on merges. The grade ledger itself keeps every count through `withKept`.

**Rules.** Replace, never layer: a folded file is removed in the same change that its numbers live elsewhere. No dice. The ledger's part counts must be identical before and after.

**Done when.** After the batch and grade files are deleted, `node --import tsx scripts/dialogue-batch/apply-grades.ts` leaves every count in data/english/part-grades.json unchanged and `npm run words:coverage` leaves data/english/coverage.json unchanged, and tests/source/data-shipping.test.ts passes.

**Files.** data/english/batches/batch-7.json, data/english/batches/batch-9.json, data/english/grades/batch-7.json, data/english/grades/batch-9.json, data/english/coverage.json

**Notes.** Tried Oct 19 (claude/batch-delete), reverted. Deleting the two batch files alone stops apply-grades ("no batch at ..."), because a grade file needs its batch unless every row carries its parts. Deleting the grade files too keeps every part count identical (only the order of the ids in the ledger's batches list changes), but data/english/coverage.json's graded counts per kind fall (for example journal 25 to 0, legislation 8 to 0) because they are counted from the batch files. So the files are not removable yet. Waits on words-coverage-graded-counts-kept.
