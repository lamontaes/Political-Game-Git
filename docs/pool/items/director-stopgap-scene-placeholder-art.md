---
id: director-stopgap-scene-placeholder-art
title: "Stopgaps in scene (placeholder-art): 1 open"
area: director
kind: stopgap
priority: 3
status: blocked
claimed-by:
pr:
blocked-on: engine or design: The Firefly library has the residences' exteriors only; the bench lists the rooms' picture names first (officialResidences in src/bench/data/scene-places.json) so they are used as soon as they are pai
milestone:
source: "src/core2/data/stopgaps.json, src/bench/scene.ts, kind placeholder-art"
---

**What.** Replace or clear the 1 open placeholder-art stopgap row(s) in src/bench/scene.ts: SG-LOC-residence-rooms. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/bench/scene.ts

**Notes.** First row: A sitting president or governor at home is shown outside the White House or the governor's residence by day and in the large house's living room at night, because neither residence has painted rooms.
