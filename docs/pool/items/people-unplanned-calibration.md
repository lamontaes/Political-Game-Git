---
id: people-unplanned-calibration
title: "The unplanned-pregnancy weights are checked across their windows in played years, and their spreads become measured"
area: people
kind: research
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The five weights of an unplanned pregnancy (renewalUnplannedExposure, renewalUnplannedAcceptance, renewalEndingBase, renewalTravelWeight, renewalTravelHalfMiles in src/core2/data/renewal/parameters.json) are hand-set TUNABLE values whose spreads are unmeasured sensitivity windows (stopgap SG-PEOPLE-unplanned-calibration). Run each across its window in generated years and record how the town's unplanned pregnancies and endings move.

**Rules.** Research before building: real rates check the town's totals and never pick a woman (no dice). Estimate, never UNKNOWN: each weight keeps its value with a measured window. One rule, all 56 places: drawn places, named with their seeds.

**Done when.** In at least three drawn places (buildBenchWorld, one played year each), each of the five weights is run at the ends of its window and the town's unplanned pregnancies and endings per 1,000 women 15 to 44 are reported against the state's published rates; each parameter's spread names the measured window; SG-PEOPLE-unplanned-calibration is resolved or narrowed to what remains.

**Files.** src/core2/data/renewal/parameters.json, src/core2/births-unplanned.ts, src/core2/data/stopgaps.json, scripts/research/

**Notes.** Opened from the Oct 24 send-back of #5749 (people-abortion-provider-distance), which registered the gap instead of measuring it.
