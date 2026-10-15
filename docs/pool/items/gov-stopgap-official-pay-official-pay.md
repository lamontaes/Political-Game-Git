---
id: gov-stopgap-official-pay-official-pay
title: "Stopgaps in official-pay (official-pay): 1 open"
area: gov
kind: stopgap
priority: 3
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/official-pay.ts, kind official-pay"
---

**What.** Replace or clear the 1 open official-pay stopgap row(s) in src/core2/modules/official-pay.ts: SG-CORE-official-salary. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/official-pay.ts

**Notes.** First row: Officials' salaries are monthly transfers, not payroll paychecks, so no income tax or payroll tax is withheld from them. The federal government and other states pay their officials, and receive heirless estates, as outsi
