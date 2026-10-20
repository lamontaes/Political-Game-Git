---
id: core-stopgap-opening-payroll-calendar-estimated-opening-employer-pay-calendar
title: "Stopgaps in opening-payroll-calendar (estimated-opening-employer-pay-calendar): 1 open"
area: core
kind: stopgap
priority: 3
status: blocked
claimed-by:
pr:
blocked-on: dataset-employer-payroll-calendars
milestone:
source: "src/core2/data/stopgaps.json, src/core2/data/opening-payroll-calendar.json, kind estimated-opening-employer-pay-calendar"
---

**What.** Replace or clear the 1 open estimated-opening-employer-pay-calendar stopgap row(s) in src/core2/data/opening-payroll-calendar.json: SG-P8-opening-employer-pay-calendar. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/data/opening-payroll-calendar.json

**Notes.** First row: Fresh employer-owned payroll frequency/phase/lag calendars estimated from dated business-frequency evidence and separately qualified public/education examples; no actual fictional employer term or legal compliance claime
