---
id: gov-body-named-by-member-title
title: 'A body is named by a member''s title ("County of Darlington commissioner")'
area: gov
kind: bug
priority: 1
status: blocked
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

**Notes.** PR #4343 fixes the first defect and part of this; verify after it merges.

Checked Oct 15 by a Claude session: #4343 (draft, in-pr as gov-record-defects-finish) already rewrites this path in the same files (voting.ts winner resolution with voting-winner-person.test.ts; body names from office records). Building here would conflict, so this waits for that PR; verify the done-when line after it merges.
