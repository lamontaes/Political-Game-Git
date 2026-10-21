---
id: release-red-research-reader-census-rerun
title: "research-data-has-reader fails on main: nine Census rerun files and a homeschool replicate-error file have no reader and no allowlist entry"
area: core
kind: bug
priority: 2
size: S
status: claimed
claimed-by: claude/research-reader-census-rerun
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-21T20:00:30.509Z
---

**What.** On main, tests/guards/research-data-has-reader.test.ts fails in two cases. (1) data/research/stopgaps-oct19/census/ holds nine files (census-rerun.results.json and eight census-SG-*.json) that nothing in src/ or scripts/ reads and the allowlist does not name. (2) data/research/people/ lists 1 unread file where the scan finds 2: census-household-pulse-homeschool-replicate-errors-2023.json has no reader. Decide for each file whether it is raw source (a rerun result builders apply into the game's own data, like the other stopgaps-oct19 files already in rawSource) or research waiting for a reader, and account for it in the right category with a reason that says why.

**Rules.** Never loosen the guard: no ceiling raised without the reason the guard asks for; a file the game should read goes to awaitingReader, not rawSource. Every entry's reason says what the file is evidence for.

**Done when.** research-data-has-reader.test.ts passes on main, each of the ten files is accounted for in the category its contents call for, and the PR body lists each file with its category and reason.

**Files.** scripts/audit/research-data-allowlist.json, tests/guards/research-data-has-reader.test.ts

**Notes.** TODO
