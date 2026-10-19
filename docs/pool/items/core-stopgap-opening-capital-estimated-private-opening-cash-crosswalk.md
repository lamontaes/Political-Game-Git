---
id: core-stopgap-opening-capital-estimated-private-opening-cash-crosswalk
title: "Stopgaps in opening-capital (estimated-private-opening-cash-crosswalk): 1 open"
area: core
kind: stopgap
priority: 3
status: blocked
claimed-by:
pr:
blocked-on: research data: the row's replacement needs sourced data (Recorded firm opening balances and capital provenance, or a matched ALL-debit/balance cohort adapter with honest distributions and measured crosswalk ...)
milestone:
source: "src/core2/data/stopgaps.json, src/core2/data/opening-capital.json, kind estimated-private-opening-cash-crosswalk"
---

**What.** Replace or clear the 1 open estimated-private-opening-cash-crosswalk stopgap row(s) in src/core2/data/opening-capital.json: SG-P8-opening-private-cash-buffer. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/data/opening-capital.json

**Notes.** First row: Generated private-employer opening cash stock from real JPMC quartile/median anchors and an explicitly estimated WHO prior times scheduled payroll plus a compatible IRS nonwage accounting-cost proxy; not observed individ
