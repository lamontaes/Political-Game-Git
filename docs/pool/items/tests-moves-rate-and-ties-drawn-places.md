---
id: tests-moves-rate-and-ties-drawn-places
title: "M1-09 migration checks fail in three independently drawn places on main"
area: people
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The M1-09 moves command fails migration assertions on three independent draws of clean main. Princeton records 28 departures against its 27.544936 limit and New Munich records 38 against 32.610066. Dickey reverses the expected ties comparison: stronger-tied adults build mean pull 0.0199606638 against 0.0184054971 for weaker ties. These migration failures are unchanged by the birth-planning fix in PR #5919.

**Rules.** No dice: departures follow people and household circumstances, with ACS rates checking totals. Diagnose the causal model or statistical assertion at the root; do not loosen the guard or choose favorable seeds to hide a failure.

**Done when.** The M1-09 command passes its departure-total and ties-comparison assertions on all three recorded seeds and places, and on an additional independent drawn place; report actual counts and compared means, preserve positive birth-rate checks, and show the cause of each correction without broad test ceilings.

**Files.** src/core2/moves.test.ts, src/core2/modules/moves.ts, src/core2/data/moves/parameters.json

**Notes.** Found by Merger 3 during PR #5919 validation; identical migration assertions reproduce on clean main 05b6dfcb73b8f5aeb9becbfba754d83089f7ba87. Princeton, West Virginia (5465692), GOLDEN_PATH_SEED=b0dbed9e2c5c1351216d3643de9ceb7dfcbfbb7a9c52364bf4a4cb9163775353; Dickey, North Dakota (3819580), GOLDEN_PATH_SEED=c56e1f0f8e3f7b04de4e27688dc922c33eabfe9e266697996054b4f7ddb925ce; New Munich, Minnesota (2745772), GOLDEN_PATH_SEED=50700b6126b15d018802c0a53259b7aa5b158cdc2796a285f9d088562c399e73
