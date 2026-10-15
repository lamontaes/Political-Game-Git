---
id: gov-winner-is-seat-term-id
title: "A race's winner is a seat-term id, not a person"
area: elections
kind: bug
priority: 1
status: claimed
claimed-by: claude/gov-winner-is-seat-term-id
pr:
blocked-on:
milestone:
source: "batch 11 defects; overnight Session C item 2"
---

**What.** The voting module's result must resolve to the person holding the term before anything reads it.

**Rules.** Ask why.

**Done when.** No scene or story prints an official:term:seat id as a winner in a drawn year.

**Files.** src/core2/modules/voting.ts, elections.ts

**Notes.** PR #4343 fixes the first defect in the engine; verify.
