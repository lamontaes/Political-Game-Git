---
id: core-stopgap-work-cash-estimated-modeled-public-pay-obligation-bridge
title: "Stopgaps in work-cash (estimated-modeled-public-pay-obligation-bridge): 1 open"
area: core
kind: stopgap
priority: 3
status: blocked
claimed-by:
pr:
blocked-on: engine or design: The current public owner/job/pay/schedule records do not reconstruct 2021 employment authority, appropriation, deductions, pension contributions or government treasury funding.
milestone:
source: "src/core2/data/stopgaps.json, src/core2/work-cash.ts, kind estimated-modeled-public-pay-obligation-bridge"
---

**What.** Replace or clear the 1 open estimated-modeled-public-pay-obligation-bridge stopgap row(s) in src/core2/work-cash.ts: SG-P8-public-payroll-due-flow. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/work-cash.ts

**Notes.** First row: A proposed source-owned public-payroll bridge would use saved estimated hourly work/pay terms and an explicitly linked modeled paying authority to fund only each genuine current attended-work obligation; it would not cla
