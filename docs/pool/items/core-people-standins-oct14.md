---
id: core-people-standins-oct14
title: "Close the people, core, director and bench stand-ins (#4151)"
area: core
kind: stopgap
priority: 2
status: in-pr
claimed-by:
pr: #4151
blocked-on:
milestone:
source: "open PR #4151"
---

**What.** 91 of 97 rows closed, 9 stay open (7 wait on another session's engine); removes 5,067 lines. Merge main, fix the unit failures it named (conversation.test), and gate line.

**Rules.** Merge main into the PR branch (plain merge, never force); a release declaration in docs/release/changes/.

**Done when.** The PR is mergeable with its gate line; the CTO merges.

**Files.** see PR

**Notes.** Read the PR body and any CTO comment first.
