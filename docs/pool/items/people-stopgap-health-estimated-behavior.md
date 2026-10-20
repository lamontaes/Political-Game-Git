---
id: people-stopgap-health-estimated-behavior
title: "Stopgaps in health (estimated-behavior): 1 open"
area: people
kind: stopgap
priority: 3
status: dropped
claimed-by:
pr:
blocked-on: research-health-sourced-parameters
milestone:
source: "src/core2/data/stopgaps.json, src/core2/data/health.json, kind estimated-behavior"
---

**What.** Replace or clear the 1 open estimated-behavior stopgap row(s) in src/core2/data/health.json: SG-P10-event-severity. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/data/health.json

**Notes.** First row: Event impulses scale Holmes-Rahe life change units into core2 stress and mood impulses with tunable conversions.

Folded into research-health-sourced-parameters (CTO, Oct 19, 2026).
