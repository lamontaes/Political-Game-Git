---
id: office-stopgap-office-day-federal-missing-engine-hook
title: "Stopgaps in office-day-federal (missing-engine-hook): 1 open"
area: office
kind: stopgap
priority: 3
status: open
claimed-by:
pr: #5262
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/office-day-federal.ts, kind missing-engine-hook"
claimed-at:
---

**What.** Replace or clear the 1 open missing-engine-hook stopgap row(s) in src/core2/office-day-federal.ts: SG-OFFICE-FED-prepared. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/office-day-federal.ts

**Notes.** Sent back 2026-10-20 from PR #5262 (branch claude/pool-fed-prepared): Refused under morning check (a stopgap row deleted); keep SG-OFFICE-FED-prepared in stopgaps.json with status resolved instead of deleting it; finish on that branch, merge main into it first. First row: What the player prepares for a federal act (the stances a re-election filing runs on, the budget request's line changes, the joint address's answers) is kept in the federal day's own table, beside the engine's.
