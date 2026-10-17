---
id: gov-body-named-by-member-title
title: 'A body is named by a member''s title ("County of Darlington commissioner")'
area: gov
kind: bug
priority: 1
status: in-pr
claimed-by: claude/gov-winner-body-verify
pr: #4923
blocked-on:
milestone:
source: "batch 11 defects; overnight Session C item 2"
claimed-at: 2026-10-17T13:27:13.069Z
---

**What.** Every body's name comes from its own record (board of commissioners, county council, town council), and the salutation bank reads that body, never Congress's default.

**Rules.** Ask why; no hand-written player text.

**Done when.** In a drawn place with a county body, scenes and news name the body from its own record.

**Files.** src/core2/modules/legislature.ts, bodies data

**Notes.** PR #4343 fixes the first defect and part of this; verify after it merges.

Checked Oct 15 by a Claude session: #4343 (draft, in-pr as gov-record-defects-finish) already rewrites this path in the same files (voting.ts winner resolution with voting-winner-person.test.ts; body names from office records). Building here would conflict, so this waits for that PR; verify the done-when line after it merges.

Not looked at in this pass: the blocker (#4608) is merged, so it is free to take; verify the done-when line against current main first, as the winner item next to it shows that part of the repair has landed.
