---
id: core-memory-remeasure
title: "Remeasure memory growth and trim the regional table"
area: core
kind: research
priority: 3
size: S
status: in-pr
claimed-by: claude/memory-remeasure
pr: #4731
blocked-on:
source: "core-needs-core-172 triage, Oct 15"
claimed-at: 2026-10-16T11:20:32.346Z
---

**What.** Memory growth was 6.6 MiB a month in Juliaetta against a ceiling of 5. News now forgets old `heard` rows; regional keeps 12 months plus each December. Remeasure with `scripts/core2-guard/memory.mjs` over three years and trim `regional/months` if it still grows.

**Rules.** Speed and memory guards stay the bench's own; one run, one number.

**Done when.** `memory.mjs` over three years in Juliaetta reports growth at or under 5 MiB a month with the table row counts listed, or the PR names the table that grows and the trim made.

**Files.** scripts/core2-guard/memory.mjs, src/core2/modules/regional.ts, src/core2/modules/news.ts

**Notes.** core.md line 229, checked Oct 15.
