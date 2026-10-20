---
id: core-stopgap-opening-income-funding-opening-outside-flow-terms-prior
title: "Stopgaps in opening-income-funding (opening-outside-flow-terms-prior): 1 open"
area: core
kind: stopgap
priority: 3
status: blocked
claimed-by:
pr:
blocked-on: dataset-2021-retirement-award-payment-dates
milestone:
source: "src/core2/data/stopgaps.json, src/core2/data/opening-income-funding.json, kind opening-outside-flow-terms-prior"
---

**What.** Replace or clear the 1 open opening-outside-flow-terms-prior stopgap row(s) in src/core2/data/opening-income-funding.json: SG-P8-opening-retirement-funding. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/data/opening-income-funding.json

**Notes.** First row: One modeled outside retirement payment boundary and exact dated funding terms linked to saved awards and income contracts. Individual eligibility, award amounts, institutional/jurisdiction crosswalk and fixed-day payment
