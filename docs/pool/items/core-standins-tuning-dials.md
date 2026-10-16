---
id: core-standins-tuning-dials
title: "Tag the tuning-dial parameters TUNABLE with a spread (from the #4151 audit rows)"
area: core
kind: stopgap
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "split from core-people-standins-oct14"
---

**What.** The #4151 audit tagged about 42 tuning-dial registry rows (the SG-P8-param weights, SG-P8-emotion-model, SG-P8-life-utility, SG-P15-closeness-model, SG-P15-candidacy-weights, SG-P15-corruption-weights, SG-P10 and SG-P13 director dials, among them) as TUNABLE parameters with a spread and a checkedAgainst line, and closed the rows. Do that on a fresh branch from main: for each dial, a TUNABLE tag with a spread (the one in its citation, else half to twice its value), and the registry row resolved with the line saying what it was checked against.

**Rules.** No hand-written player text; replace, never layer (the stand-in and its registry row go in the same change); a row is closed only by the replacement, never by deleting the row without it; one rule, all 56 places; no dice.

**Done when.** The stopgap tripwire test passes with the rows resolved, `parameters.json` entries all carry a tag and a spread, and a drawn-place played year (`buildBenchWorld`, seed and place named) runs with the same results as before the tagging (it changes labels, not values).

**Files.** src/core2/data/parameters.json, src/core2/data/*/parameters.json, src/core2/data/stopgaps.json, src/core2/tooling/tripwires.test.ts

**Notes.** A data-only change; it should merge without touching engine code. Split from core-people-standins-oct14 (Oct 16): PR #4151 (branch stopgaps/people-core) now conflicts with main in about 40 files and was not merged; its table of rows is in that PR's description.
