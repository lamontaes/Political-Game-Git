---
id: office-stopgap-office-day-official-pay
title: "Stopgaps in office-day (official-pay): 1 open"
area: office
kind: stopgap
priority: 3
status: done
claimed-by: claude/stipend-withholding
pr: #4823
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/office-day.ts, kind official-pay"
claimed-at: 2026-10-16T21:07:25.734Z
---

**What.** Replace or clear the 1 open official-pay stopgap row(s) in src/core2/modules/office-day.ts: SG-OFFICE-stipend-transfer. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/office-day.ts

**Notes.** First row: A part-time local seat's stipend is a monthly transfer from the town's or county's treasury, counted on its books, not a paycheck, so no income tax or payroll tax is withheld from it.
