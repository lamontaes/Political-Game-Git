---
id: core-stopgap-life-household-contact-logic-gap
title: "Stopgaps in life (household-contact-logic-gap): 1 open"
area: core
kind: stopgap
priority: 3
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/life.ts, kind household-contact-logic-gap"
---

**What.** Replace or clear the 1 open household-contact-logic-gap stopgap row(s) in src/core2/modules/life.ts: SG-P8-household-shared-time-contact. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/life.ts

**Notes.** First row: Shared residence and need for company do not yet reliably produce household contact before distant acquaintance offers.
