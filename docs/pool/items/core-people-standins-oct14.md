---
id: core-people-standins-oct14
title: "Close the people, core, director and bench stand-ins (#4151)"
area: core
kind: stopgap
priority: 2
status: done
claimed-by: claude/core-people-standins
pr: #4601
blocked-on:
milestone:
source: "open PR #4151"
claimed-at: 2026-10-16T04:29:19.650Z
---

**What.** 91 of 97 rows closed, 9 stay open (7 wait on another session's engine); removes 5,067 lines. Merge main, fix the unit failures it named (conversation.test), and gate line.

**Rules.** Merge main into the PR branch (plain merge, never force); a release declaration in docs/release/changes/.

**Done when.** The PR is mergeable with its gate line; the CTO merges.

**Files.** see PR

**Notes.** Read the PR body and any CTO comment first.

Sent back 2026-10-16 from PR #4151 (branch stopgaps/people-core): merging main conflicts in src/bench/world.ts, src/core2/births-plan.ts, src/core2/data/candidacy/parameters.json, src/core2/data/parameters.json, src/core2/data/views/views.json, src/core2/deep-past.ts, src/core2/modules/drives.ts, src/core2/modules/health.ts, src/core2/modules/moves.ts, src/core2/modules/residents.ts, src/core2/opening-falling-outs.test.ts, src/core2/opening-falling-outs.ts, src/core2/opening-favors.test.ts, src/core2/opening-favors.ts, src/core2/opening-kin.ts, src/core2/opening-voter-groups.ts, src/core2/residents.ts, src/core2/tooling/generated-world.ts, src/core2/world-settings.ts, src/director/bring-it-up.test.ts, src/director/bring-it-up.ts, src/director/conversation.test.ts, src/director/conversation.ts, src/director/data/bring-it-up.json, src/director/data/conversation.json, src/director/data/filing-visit.json, src/director/data/journal.json, src/director/data/scene-words.json, src/director/data/stopgaps.json, src/director/director.test.ts, src/director/filing-visit.test.ts, src/director/filing-visit.ts, src/director/journal.test.ts, src/director/journal.ts, src/director/ledger.ts, src/director/scene.test.ts, src/director/scene.ts (code or data, left for the author); resolve and push; finish on that branch, merge main into it first.

Finding (Oct 16, the claiming session, not merged): merging current main into #4151's branch (stopgaps/people-core) conflicts in about 40 files: the director (journal, conversation, scene, filing-visit, bring-it-up and their data and tests), the opening (births-plan, deep-past, opening-kin, opening-voter-groups, the falling-outs and favors files), residents, moves, health, drives, the world settings, the parameter and stopgap tables. Several are modify/delete: the branch deletes files main kept and changed (opening-falling-outs, opening-favors) and main deleted files the branch changed (the director's data JSON, opening-voter-groups). Main's director and English-bank work has covered much of what the branch's director rows did. Resolving this by hand in one pass would guess at 40 files' intent. Re-do it by area on fresh branches from main: (1) tuning-dial rows (TUNABLE tags and spreads) as one data-only change; (2) the opening deletions (falling-outs, favors, shared-past, visitor family); (3) the director's rows; (4) residents and moves. SG-P15-moves-pinned-jobs and SG-FIXER-moves-income-household are not deleted on main (PR #4531 narrows only the owners-stay row), so the branch's "DELETE" of those two needs the income-award and agreement mechanics first (pool item core-moves-pinned-and-income-stopgaps).
