---
id: gov-winner-is-seat-term-id
title: "A race's winner is a seat-term id, not a person"
area: elections
kind: bug
priority: 1
status: done
claimed-by: claude/gov-winner-names
pr: #4927
blocked-on: gov-record-defects-finish
milestone:
source: "batch 11 defects; overnight Session C item 2"
claimed-at: 2026-10-17T13:53:36.341Z
---

**What.** The voting module's result must resolve to the person holding the term before anything reads it.

**Rules.** Ask why.

**Done when.** No scene or story prints an official:term:seat id as a winner in a drawn year.

**Files.** src/core2/modules/voting.ts, elections.ts

**Notes.** PR #4343 fixes the first defect in the engine; verify.

Checked Oct 15 by a Claude session: #4343 (draft, in-pr as gov-record-defects-finish) already rewrites this path in the same files (voting.ts winner resolution with voting-winner-person.test.ts; body names from office records). Building here would conflict, so this waits for that PR; verify the done-when line after it merges.
