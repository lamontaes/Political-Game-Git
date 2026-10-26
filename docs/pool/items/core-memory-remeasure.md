---
id: core-memory-remeasure
title: "Remeasure memory growth and trim the regional table"
area: core
kind: research
priority: 3
size: S
status: done
claimed-by:
pr: #4731
blocked-on:
source: "core-needs-core-172 triage, Oct 15"
claimed-at:
---

**What.** Memory growth was 6.6 MiB a month in Juliaetta against a ceiling of 5. News now forgets old `heard` rows; regional keeps 12 months plus each December. Remeasure with `scripts/core2-guard/memory.mjs` over three years and trim `regional/months` if it still grows.

**Rules.** Speed and memory guards stay the bench's own; one run, one number.

**Done when.** `memory.mjs` over three years in Juliaetta reports growth at or under 5 MiB a month with the table row counts listed, or the PR names the table that grows and the trim made.

**Files.** scripts/core2-guard/memory.mjs, src/core2/modules/regional.ts, src/core2/modules/news.ts

**Notes.** core.md line 229, checked Oct 15.

Sent back 2026-10-16 from PR #4731 (branch claude/memory-remeasure): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4731 (branch claude/memory-remeasure): Merging current main into claude/memory-remeasure conflicts in src/core2/modules/budgets.ts. Resolve and push these conflicts on this branch before local checks can run; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4731 (branch claude/memory-remeasure): merging main conflicts in src/core2/modules/budgets.ts (code or data, left for the author); resolve and push; finish on that branch, merge main into it first.
