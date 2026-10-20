---
id: world-stopgap-opening-finance-estimated-customer-first-due-and-budget
title: "Stopgaps in opening-finance (estimated-customer-first-due-and-budget-horizon): 1 open"
area: world
kind: stopgap
priority: 3
status: blocked
claimed-by:
pr:
blocked-on: research data: the row's replacement needs recorded, empirical or sourced data (The later public-budget/procurement and national-external-customer modules supply actual dated agreements, invoice/calendar and amendment/renewal/end ...)
milestone:
source: "src/core2/data/stopgaps.json, src/core2/data/opening-finance.json, kind estimated-customer-first-due-and-budget-horizon"
---

**What.** Replace or clear the 1 open estimated-customer-first-due-and-budget-horizon stopgap row(s) in src/core2/data/opening-finance.json: SG-P8-customer-due-calendar-renewal. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/data/opening-finance.json

**Notes.** First row: First-next-period-month payment and a twelve-month source-year budget horizon are generated conventions; the annual statistical source does not observe any actual contract expiry or renewal.
