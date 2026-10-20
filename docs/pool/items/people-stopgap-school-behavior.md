---
id: people-stopgap-school-behavior
title: "Stopgaps in school (behavior): 1 open"
area: people
kind: stopgap
priority: 3
status: dropped
claimed-by:
pr:
blocked-on: research-school-sourced-parameters
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/school.ts, kind behavior"
---

**What.** Replace or clear the 1 open behavior stopgap row(s) in src/core2/modules/school.ts: SG-CORE-school-days. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/school.ts

**Notes.** First row: Every school-age full person attends the town's public school district (or, in a world opened without it, their town's schools as a place) on the weekdays of one national school calendar (Sept. 1 to June 10, the federal

Folded into research-school-sourced-parameters (CTO, Oct 19, 2026).
