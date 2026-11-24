---
id: core-recompute-covered-fraction
title: "Retirement covered fraction counts from age 22; the game starts at 18"
area: core
kind: bug
priority: 3
size: S
status: done
claimed-by:
pr: #4710
blocked-on:
source: "core-needs-core-172 triage, Oct 15"
claimed-at:
---

**What.** `openingRetirementCoveredFraction` (0.75) comes from a source that counts from age 22 by sex, but the game's adults start at 18. Recompute it from the source on the game's base and record it in the parameter table with its spread.

**Rules.** Every number is SOURCED, ESTIMATED or TUNABLE in the parameter table.

**Done when.** The parameter row shows the recomputed fraction with its source and spread, its stopgap is resolved, and a test in a drawn place from all 56 opens retirees with that coverage and names one retiree's claim by record id.

**Files.** src/core2/data/parameters.json, src/core2/modules/retirement-claims.ts

**Notes.** core.md line 194, checked Oct 15: the stopgap is open.

Sent back 2026-10-16 from PR #4710 (branch claude/covered-fraction): GitHub refuses to merge a draft pull request (HTTP 405: "Pull Request is still a draft"). The merger skill's prescribed REST ready-for-review endpoint returns HTTP 404. Mark this PR ready for review, retain the named changed-file checks at the top, and push any needed corrections; finish on that branch, merge main into it first.
