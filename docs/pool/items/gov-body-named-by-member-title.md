---
id: gov-body-named-by-member-title
title: 'A body is named by a member''s title ("County of Darlington commissioner")'
area: gov
kind: bug
priority: 1
status: open
claimed-by:
pr:
blocked-on: gov-record-defects-finish
milestone:
source: "batch 11 defects; overnight Session C item 2"
---

**What.** Every body's name comes from its own record (board of commissioners, county council, town council), and the salutation bank reads that body, never Congress's default.

**Rules.** Ask why; no hand-written player text.

**Done when.** In a drawn place with a county body, scenes and news name the body from its own record.

**Files.** src/core2/modules/legislature.ts, bodies data

**Notes.** (Oct 15, a second session built this on its own and closed #4422 as a duplicate: #4343 already carries `bodyName` on each local office row, `src/core2/data/offices/body-names.json` and a stopgap for charter names. Do not build a second one; verify the done-when line after #4343 merges, then mark done.) PR #4343 fixes the first defect and part of this; verify after it merges.
