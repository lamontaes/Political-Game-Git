---
id: core-recompute-covered-fraction
title: "Retirement covered fraction counts from age 22; the game starts at 18"
area: core
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: "core-needs-core-172 triage, Oct 15"
---

**What.** `openingRetirementCoveredFraction` (0.75) comes from a source that counts from age 22 by sex, but the game's adults start at 18. Recompute it from the source on the game's base and record it in the parameter table with its spread.

**Rules.** Every number is SOURCED, ESTIMATED or TUNABLE in the parameter table.

**Done when.** The parameter row shows the recomputed fraction with its source and spread, its stopgap is resolved, and a test in a drawn place from all 56 opens retirees with that coverage and names one retiree's claim by record id.

**Files.** src/core2/data/parameters.json, src/core2/modules/retirement-claims.ts

**Notes.** core.md line 194, checked Oct 15: the stopgap is open.
