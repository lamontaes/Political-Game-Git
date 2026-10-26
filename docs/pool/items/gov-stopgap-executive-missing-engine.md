---
id: gov-stopgap-executive-missing-engine
title: "Stopgaps in executive (missing-engine): 1 open"
area: gov
kind: stopgap
priority: 3
status: done
claimed-by: claude/state-cabinet-pay
pr: #5221
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/executive.ts, kind missing-engine"
claimed-at: 2026-10-19T22:16:31.028Z
---

**What.** Replace or clear the 1 open missing-engine stopgap row(s) in src/core2/modules/executive.ts: SG-GOV-appointee-pay. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/executive.ts

**Notes.** First row: A town department head appointed where no town treasury is open holds the post without pay (with budgets open, they're on the town's payroll); state cabinet members are identities and draw no pay.
