---
id: core-stopgap-closeness-relationship-closeness-model
title: "Stopgaps in closeness (relationship-closeness-model): 1 open"
area: core
kind: stopgap
priority: 3
status: blocked
claimed-by: claude/closeness-stopgap
pr:
blocked-on: research-core-sourced-parameters
milestone:
source: "src/core2/data/stopgaps.json, src/core2/data/closeness.json, kind relationship-closeness-model"
claimed-at: 2026-10-19T23:28:43.862Z
---

**What.** Replace or clear the 1 open relationship-closeness-model stopgap row(s) in src/core2/data/closeness.json: SG-P15-closeness-model. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/data/closeness.json

**Notes.** First row: Closeness is hours together over hours plus a sourced half-closeness point, fading by a tunable half-life; opening closeness uses the average GSS visit rate for the tie and a registered conversion of answer categories to

Looked at Oct 19 (claude/political-game-pool-b6g0dl), not built: the row's own replacement is closeness calibrated against a measured panel of tie strength and contact (Roberts and Dunbar network data or a US panel), with per-pair opening histories from the shared past. No such panel is in the repository, and the hour thresholds the model uses come from Hall (2019). This is a research item first: a session with web access must source the panel and its decay curve, then replace the half-closeness point and half-life in src/core2/data/closeness.json. Per-pair opening histories wait on the shared-past work (core-stopgap-deep-past-shared-past-generation-gap).
