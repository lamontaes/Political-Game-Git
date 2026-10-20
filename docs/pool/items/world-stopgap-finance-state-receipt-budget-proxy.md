---
id: world-stopgap-finance-state-receipt-budget-proxy
title: "Stopgaps in finance-state (receipt-budget-proxy): 1 open"
area: world
kind: stopgap
priority: 3
status: blocked
claimed-by:
pr:
blocked-on: engine or design: The completed finance year exhausted retailers with forecast-based input budgets and left most other firms without customers. Industry-level IRS ratios exist, but individual invoices and a verified in
milestone:
source: "src/core2/data/stopgaps.json, src/core2/finance-state.ts, kind receipt-budget-proxy"
---

**What.** Replace or clear the 1 open receipt-budget-proxy stopgap row(s) in src/core2/finance-state.ts: SG-P8-finance-sales-receipt-budgets. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/finance-state.ts

**Notes.** First row: Opening supplier reference budgets become cost-to-revenue ratios applied to novel actual received sales, allocated across all active routes with integer largest-remainder rounding per dated pool. A route accumulates its
