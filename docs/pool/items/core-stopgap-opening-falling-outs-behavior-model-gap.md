---
id: core-stopgap-opening-falling-outs-behavior-model-gap
title: "Stopgaps in opening-falling-outs (behavior-model-gap): 1 open"
area: core
kind: stopgap
priority: 3
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/data/opening-falling-outs.json, kind behavior-model-gap"
---

**What.** Replace or clear the 1 open behavior-model-gap stopgap row(s) in src/core2/data/opening-falling-outs.json: SG-P15-falling-outs. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/data/opening-falling-outs.json

**Notes.** First row: Falling-outs in the shared past build from the years a pair shared a class or workgroup and both people's conflict and reliability traits, with tunable trait weights; the base rate is solved to YouGov's lifetime share of
