---
id: office-stopgap-office-day-acts-rule-copy
title: "Stopgaps in office-day-acts (rule-copy): 1 open"
area: office
kind: stopgap
priority: 3
status: done
claimed-by: claude/case-rule-copy
pr: #4582
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/office-day-acts.ts, kind rule-copy"
claimed-at: 2026-10-16T03:20:57.360Z
---

**What.** Replace or clear the 1 open rule-copy stopgap row(s) in src/core2/office-day-acts.ts: SG-OFFICE-case-rule-copy. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/office-day-acts.ts

**Notes.** First row: When the player's office hours come and the player has not decided a case, office-day decides it by the character's sense of duty (the base share of officials who help, tilted by traits), a copy of the rule the constitue
