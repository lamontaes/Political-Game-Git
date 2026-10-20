---
id: gov-stopgap-world-legislating-behavior
title: "Stopgaps in world-legislating (behavior): 1 open"
area: gov
kind: stopgap
priority: 3
status: blocked
claimed-by:
pr:
blocked-on: engine or design: Towns governed by a township board never legislated at all: only councils and county boards met (Oct 13 lawmaking-volume fix).
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/world-legislating.ts, kind behavior"
---

**What.** Replace or clear the 1 open behavior stopgap row(s) in src/core2/modules/world-legislating.ts: SG-GOV-township-law-level. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/world-legislating.ts

**Notes.** First row: A township board's ordinances are written as the town's own local law (the place level of the law chain), and a township board only legislates where no town council does; the law chain has no township level, so a townshi
