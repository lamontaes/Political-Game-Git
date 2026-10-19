---
id: core-stopgap-opening-favors-behavior-model-gap
title: "Stopgaps in opening-favors (behavior-model-gap): 1 open"
area: core
kind: stopgap
priority: 3
status: dropped
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/data/opening-favors.json, kind behavior-model-gap"
---

**What.** Replace or clear the 1 open behavior-model-gap stopgap row(s) in src/core2/data/opening-favors.json: SG-P15-favors. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/data/opening-favors.json

**Notes.** First row: Favors in the shared past come only at a resident's recorded move into the county, from people they shared a class or workgroup with, by closeness at the time from a tunable hours-per-shared-year; the rate is solved to a

Checked 2026-10-16 against main and dropped as already done: its only stopgap SG-P15-favors is resolved in stopgaps.json, and the opening favors file it named (src/core2/data/opening-favors.json) is gone from main: the invented opening favors were deleted. Nothing is left to build; no PR of this item's own did the work.
