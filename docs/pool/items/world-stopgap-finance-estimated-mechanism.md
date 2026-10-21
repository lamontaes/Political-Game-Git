---
id: world-stopgap-finance-estimated-mechanism
title: "Stopgaps in finance (estimated-mechanism): 1 open"
area: world
kind: stopgap
priority: 3
status: blocked
claimed-by:
pr:
blocked-on: engine or design: Prototype finance mechanism; real household purchase decisions, complete institutional accounts and jurisdiction-specific insolvency process remain absent.
milestone:
source: "src/core2/data/stopgaps.json, src/core2/data/finance.json, kind estimated-mechanism"
---

**What.** Replace or clear the 1 open estimated-mechanism stopgap row(s) in src/core2/data/finance.json: SG-P8-finance-settlement-policy. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/data/finance.json

**Notes.** First row: Monthly standing household budgets, modeled within-day work pay before household purchases, conservative finite recorded credit, interest accounting and immediate closure after an actual unfunded obligation when cash and
