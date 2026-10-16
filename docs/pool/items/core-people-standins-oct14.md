---
id: core-people-standins-oct14
title: "Close the people, core, director and bench stand-ins (#4151)"
area: core
kind: stopgap
priority: 2
status: open
claimed-by:
pr: #4151
blocked-on:
milestone:
source: "open PR #4151"
claimed-at: 
---

**What.** 91 of 97 rows closed, 9 stay open (7 wait on another session's engine); removes 5,067 lines. Merge main, fix the unit failures it named (conversation.test), and gate line.

**Rules.** Merge main into the PR branch (plain merge, never force); a release declaration in docs/release/changes/.

**Done when.** The PR is mergeable with its gate line; the CTO merges.

**Files.** see PR

**Notes.** Read the PR body and any CTO comment first.

Sent back 2026-10-16 from PR #4151 (branch stopgaps/people-core): merging main conflicts in src/bench/world.ts, src/core2/births-plan.ts, src/core2/data/candidacy/parameters.json, src/core2/data/parameters.json, src/core2/data/views/views.json, src/core2/deep-past.ts, src/core2/modules/drives.ts, src/core2/modules/health.ts, src/core2/modules/moves.ts, src/core2/modules/residents.ts, src/core2/opening-falling-outs.test.ts, src/core2/opening-falling-outs.ts, src/core2/opening-favors.test.ts, src/core2/opening-favors.ts, src/core2/opening-kin.ts, src/core2/opening-voter-groups.ts, src/core2/residents.ts, src/core2/tooling/generated-world.ts, src/core2/world-settings.ts, src/director/bring-it-up.test.ts, src/director/bring-it-up.ts, src/director/conversation.test.ts, src/director/conversation.ts, src/director/data/bring-it-up.json, src/director/data/conversation.json, src/director/data/filing-visit.json, src/director/data/journal.json, src/director/data/scene-words.json, src/director/data/stopgaps.json, src/director/director.test.ts, src/director/filing-visit.test.ts, src/director/filing-visit.ts, src/director/journal.test.ts, src/director/journal.ts, src/director/ledger.ts, src/director/scene.test.ts, src/director/scene.ts (code or data, left for the author); resolve and push; finish on that branch, merge main into it first.
