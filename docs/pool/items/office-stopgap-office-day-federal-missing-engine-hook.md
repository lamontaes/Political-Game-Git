---
id: office-stopgap-office-day-federal-missing-engine-hook
title: "Stopgaps in office-day-federal (missing-engine-hook): 1 open"
area: office
kind: stopgap
priority: 3
status: in-pr
claimed-by: claude/pool-fed-prepared
pr: #5262
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/office-day-federal.ts, kind missing-engine-hook"
claimed-at: 2026-10-19T23:18:04.164Z
---

**What.** Replace or clear the 1 open missing-engine-hook stopgap row(s) in src/core2/office-day-federal.ts: SG-OFFICE-FED-prepared. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/office-day-federal.ts

**Notes.** First row: What the player prepares for a federal act (the stances a re-election filing runs on, the budget request's line changes, the joint address's answers) is kept in the federal day's own table, beside the engine's.
