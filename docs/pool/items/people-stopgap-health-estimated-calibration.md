---
id: people-stopgap-health-estimated-calibration
title: "Stopgaps in health (estimated-calibration): 1 open"
area: people
kind: stopgap
priority: 3
status: dropped
claimed-by:
pr:
blocked-on: research-health-sourced-parameters
milestone:
source: "src/core2/data/stopgaps.json, src/core2/data/health.json, kind estimated-calibration"
---

**What.** Replace or clear the 1 open estimated-calibration stopgap row(s) in src/core2/data/health.json: SG-P10-resilience-scale. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/data/health.json

**Notes.** First row: One base-rate scale (0.106) for every place, solved from two generated towns so expected yearly deaths match the SSA 2023 life table; the chronic-condition weights were calibrated for the old shared threshold and are not

Folded into research-health-sourced-parameters (CTO, Oct 19, 2026).
