---
id: gov-stopgap-budgets-missing-engine
title: "Stopgaps in budgets (missing-engine): 1 open"
area: gov
kind: stopgap
priority: 3
status: in-pr
claimed-by: claude/budget-adoption-narrow
pr: #5376
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/budgets.ts, kind missing-engine"
claimed-at: 2026-10-20T01:05:56.393Z
---

**What.** Replace or clear the 1 open missing-engine stopgap row(s) in src/core2/modules/budgets.ts: SG-GOV-budget-adopted-by-rule. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/budgets.ts

**Notes.** First row: Each new fiscal year's budget is adopted on its start date by carrying the year's amounts forward.
