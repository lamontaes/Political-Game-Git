---
id: core-stopgap-parameters-authored-memory-budget
title: "Stopgaps in parameters (authored-memory-budget): 1 open"
area: core
kind: stopgap
priority: 3
status: claimed
claimed-by: claude/memory-budget-stopgap
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/data/parameters.json, kind authored-memory-budget"
claimed-at: 2026-10-19T23:45:36.208Z
---

**What.** Replace or clear the 1 open authored-memory-budget stopgap row(s) in src/core2/data/parameters.json: SG-P8-work-result-retention. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/data/parameters.json

**Notes.** First row: Retains latest/cumulative work results and a tunable finite number of quiet weekly rollups.

Looked at Oct 19 (claude/political-game-pool-b6g0dl), not built: SG-P8-work-result-retention is the number of quiet weekly work rollups `compactQuietWorkResults` (src/core2/work-state.ts) keeps before deleting them. It is a memory budget, not a missing mechanic: no human-forgetting measurement could replace it, and AGENTS.md "Keep it simple" says bookkeeping is a debug switch. Nothing reads the rollups past the cutoff by design. What closes the row is a CTO decision that an engineering memory budget is a TUNABLE parameter (with the spread it was checked against) and not a stopgap, which is filed as owner-stopgap-memory-budgets.
