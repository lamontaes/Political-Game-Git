---
id: core-stopgap-life-contact-frequency-logic-gap
title: "Stopgaps in life (contact-frequency-logic-gap): 1 open"
area: core
kind: stopgap
priority: 3
status: in-pr
claimed-by: claude/pool-contact-measured
pr: #5281
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/life.ts, kind contact-frequency-logic-gap"
claimed-at: 2026-10-19T23:34:11.876Z
---

**What.** Replace or clear the 1 open contact-frequency-logic-gap stopgap row(s) in src/core2/modules/life.ts: SG-P8-school-acquaintance-contact-frequency. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/life.ts

**Notes.** First row: Recognized historical school peers receive routine contact opportunities without a tie-type contact-frequency model or recorded present-day availability.
