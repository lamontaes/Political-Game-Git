---
id: laws-stopgap-laws-data-gap
title: "Stopgaps in laws (data-gap): 1 open"
area: laws
kind: stopgap
priority: 3
status: blocked
claimed-by:
pr:
blocked-on: research data: the row's replacement needs sourced data (Sourced phases in force on January 20, 2025 for each series and place in src/core2/data/laws/starting-law.json (2025 tax brackets and rates, FY2025 SN...)
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/laws.ts, kind data-gap"
---

**What.** Replace or clear the 1 open data-gap stopgap row(s) in src/core2/modules/laws.ts: SG-GOV-start-law-carried-back. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/laws.ts

**Notes.** First row: A law whose first recorded phase begins after the January 20, 2025 start (most income tax, sales tax, property tax, SNAP, unemployment and Medicaid rows begin October 2025 or January 2026) is in force from the start at t
