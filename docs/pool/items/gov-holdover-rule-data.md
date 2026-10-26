---
id: gov-holdover-rule-data
title: "Holdover rules as data: what each place's law says about an officeholder whose term ends with no successor"
area: gov
kind: research
priority: 1
size: M
status: done
claimed-by: claude/gov-holdover-rule-data
pr: #4458
blocked-on:
milestone:
source: "split from gov-empty-race-holdover"
claimed-at: 2026-10-15T21:30:15.730Z
---

**What.** For each of the 56 places and each elected office family (local board, county office, state legislature, state executive, federal), record what the law says when a term ends and no successor has qualified: the official holds over until a successor qualifies, the seat is vacant, or another rule. Each row carries its citation and is tagged SOURCED, or ESTIMATED with source and spread where the law is not found. Data only; the engine reads it in `gov-empty-special-repeats`.

**Rules.** Research before building (real law checks the simulation, it never decides one outcome); one rule, all 56 places (no place named in logic); estimate, never UNKNOWN.

**Done when.** A data file under `src/core2/data/offices/` covers all 56 places and every elected office family, each row cited or estimated, and a test draws a random place and checks its rows.

**Files.** src/core2/data/offices/ (new data file), the offices data loader.

**Notes.** Check `src/core2/data/offices/incompatibility.json` for the row shape used by the sibling table.
