---
id: gov-body-named-by-member-title
title: 'A body is named by a member''s title ("County of Darlington commissioner")'
area: gov
kind: bug
priority: 1
status: claimed
claimed-by: pool/gov-body-named-by-member-title
pr:
blocked-on:
milestone:
source: "batch 11 defects; overnight Session C item 2"
---

**What.** Every body's name comes from its own record (board of commissioners, county council, town council), and the salutation bank reads that body, never Congress's default.

**Rules.** Ask why; no hand-written player text.

**Done when.** In a drawn place with a county body, scenes and news name the body from its own record.

**Files.** src/core2/modules/legislature.ts, bodies data

**Notes.** PR #4343 fixes the first defect and part of this; verify after it merges.
