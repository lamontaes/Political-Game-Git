---
id: words-coverage-graded-counts-kept
title: "The coverage report keeps its graded counts per situation kind without reading the batch files"
area: words
kind: cleanup
priority: 3
size: S
status: done
claimed-by: claude/coverage-counts
pr: #5116
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T19:19:37.450Z
---

**What.** data/english/coverage.json reports how many graded lines each kind of situation has, and it counts them by reading every batch file and grade file on disk. Deleting a folded batch therefore lowers the report (journal 25 to 0, legislation 8 to 0 when batch-7 and batch-9 go), though the owner's grades are unchanged in part-grades.json. Keep those counts in the ledger as each batch is folded, so the report reads the ledger and no batch file.

**Rules.** Replace, never layer: the report's count comes from the ledger only, and the batch scan is deleted. No dice. One rule, all places: the counts name no place.

**Done when.** With batch-7.json, batch-9.json and their grade files deleted, `npm run words:coverage` writes a data/english/coverage.json identical to the one written with them present, shown by a test in scripts/dialogue-batch that compares the two runs.

**Files.** scripts/dialogue-batch/coverage-table.ts, scripts/dialogue-batch/apply-grades.ts, data/english/part-grades.json

**Notes.** Found Oct 19 while trying to delete the folded batches; see words-batch-files-delete-folded.

Oct 20: PR #5116 merged to main: the coverage report keeps each graded batch's counts by id.
