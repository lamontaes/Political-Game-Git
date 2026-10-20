---
id: core-stopgap-work-prototype-pay-projection
title: "Stopgaps in work (prototype-pay-projection): 1 open"
area: core
kind: stopgap
priority: 3
status: blocked
claimed-by:
pr:
blocked-on: engine or design: No historical signed hourly/salary/overtime agreement, pay calendar, tax/law treatment or revenue model. Same-payer lexical job order is authored.
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/work.ts, kind prototype-pay-projection"
---

**What.** Replace or clear the 1 open prototype-pay-projection stopgap row(s) in src/core2/modules/work.ts: SG-P8-work-pay-terms. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/work.ts

**Notes.** First row: Projects hourly SOC wage proxies onto actual attended minutes and immediate same-day conserving payment.
