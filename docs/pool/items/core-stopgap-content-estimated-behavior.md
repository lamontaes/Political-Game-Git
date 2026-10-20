---
id: core-stopgap-content-estimated-behavior
title: "Stopgaps in content (estimated-behavior): 1 open"
area: core
kind: stopgap
priority: 3
status: blocked
claimed-by: claude/content-estimated
pr: #5280
blocked-on: dataset-p9-cohort-activity-coefficients
milestone:
source: "src/core2/data/stopgaps.json, src/core2/data/content.json, kind estimated-behavior"
claimed-at: 2026-10-19T23:35:39.096Z
---

**What.** Replace or clear the 1 open estimated-behavior stopgap row(s) in src/core2/data/content.json: SG-P8-life-utility. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/data/content.json

**Notes.** First row: Prototype need, goal, affect and trait utility mappings; authored player-circle daily, local-town weekly, state monthly and inactive husk cadence; one scored discretionary act per tier activation instead of a complete ac
