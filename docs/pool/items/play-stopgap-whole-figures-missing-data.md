---
id: play-stopgap-whole-figures-missing-data
title: "Stopgaps in whole-figures (missing-data): 1 open"
area: play
kind: stopgap
priority: 3
status: blocked
claimed-by:
pr:
blocked-on: engine or design: The approved art has 4 teen and 4 child looks, one activity each, and no adult version of any teen look.
milestone:
source: "src/core2/data/stopgaps.json, src/bench/whole-figures.ts, kind missing-data"
---

**What.** Replace or clear the 1 open missing-data stopgap row(s) in src/bench/whole-figures.ts: SG-PEOPLE-one-look-per-activity. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/bench/whole-figures.ts

**Notes.** First row: Each approved look is painted doing one thing, so a person whose look doesn't fit where they are (a teen boy's skateboard or basketball indoors, a laptop off work) is drawn in their next look, or the nearest-age look tha
