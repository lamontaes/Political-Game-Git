---
id: release-red-research-reader-census-rerun
title: "research-data-has-reader fails on main: nine Census rerun files and a homeschool replicate-error file have no reader and no allowlist entry"
area: core
kind: bug
priority: 2
size: S
status: done
claimed-by:
pr: #5828
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** On main, tests/guards/research-data-has-reader.test.ts fails in two cases. (1) data/research/stopgaps-oct19/census/ holds nine files (census-rerun.results.json and eight census-SG-*.json) that nothing in src/ or scripts/ reads and the allowlist does not name. (2) data/research/people/ lists 1 unread file where the scan finds 2: census-household-pulse-homeschool-replicate-errors-2023.json has no reader. Decide for each file whether it is raw source (a rerun result builders apply into the game's own data, like the other stopgaps-oct19 files already in rawSource) or research waiting for a reader, and account for it in the right category with a reason that says why.

**Rules.** Never loosen the guard: no ceiling raised without the reason the guard asks for; a file the game should read goes to awaitingReader, not rawSource. Every entry's reason says what the file is evidence for.

**Done when.** research-data-has-reader.test.ts passes on main, each of the ten files is accounted for in the category its contents call for, and the PR body lists each file with its category and reason. **On screen.** None by design: this is a check, a speed or tooling change, or a cleanup; the player notices only that the game keeps running and the numbers stay believable.

**Files.** scripts/audit/research-data-allowlist.json, tests/guards/research-data-has-reader.test.ts

**Notes.** TODO

Sent back 2026-10-23 from PR #5828 (branch claude/research-reader-census-rerun): Ten rawSource additions clear a red research-reader guard through a bypass list, explicitly disallowed by the merger Guards rule; supply the reader/accounting repair; finish on that branch, merge main into it first.

Oct 25 audit: From the dropped guards-research-data-reader-red-on-base: at 8911f21ed9 the guard listed eleven files under data/research/people/ (the Household Pulse homeschool replicate errors).

Merger 2: 2026-10-26 own clean-main b3c06e202f33329975fea51180677e39df87afce rerun for the morning-audit acceptance returns3/5 in14.64s. The unaccounted set is eleven files: the nine census rerun files above, census-household-pulse-homeschool-replicate-errors-2023.json, and contact-frequency-by-tie.json. The second failure is now the data/research/jobs/series/ folder entry, which lists1 unread file but finds0, so lower or remove that stale count. No guard bypass or ceiling changes were made. The audit umbrella stays OPEN; #5818 completes only bounded browser assertions.
