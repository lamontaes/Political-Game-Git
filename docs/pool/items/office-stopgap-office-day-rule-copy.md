---
id: office-stopgap-office-day-rule-copy
title: "Stopgaps in office-day (rule-copy): 1 open"
area: office
kind: stopgap
priority: 3
status: done
claimed-by: claude/desk-rule-copy
pr: #4570
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/office-day.ts, kind rule-copy"
claimed-at: 2026-10-16T03:00:10.487Z
---

**What.** Replace or clear the 1 open rule-copy stopgap row(s) in src/core2/modules/office-day.ts: SG-OFFICE-desk-rule-copy. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/office-day.ts

**Notes.** First row: When the player leaves the desk to the character, office-day recomputes the sign-or-veto lean (position plus temperament scaled by how settled the law is) from the legislature engine's exported parts, a copy of the rule
