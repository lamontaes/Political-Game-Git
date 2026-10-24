---
id: world-regional-opening-misses-state-figures
title: "M1-03: some states open with pay or unemployment off their real figures (DC unemployment 2.9 against 5.6; Virginia pay 8 percent high)"
area: world
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The new M1-03 check compares every state's opening figures with the raw series in src/core2/data/regional/regions.json (BLS LAUS, BLS CES, BEA regional price parities). On main 2ab5bf066d, DC opens at 2.9 percent unemployment against 5.6 real, Rhode Island at 4.2 against 4.5, Hawaii's hourly pay at 36.63 against 37.29, and Virginia's at 38.24 against 35.35. src/core2/regional-model.ts:182-184 takes a whole metro's LAUS rate in place of the state's own, and :200 builds state pay as statePay times a population-weighted income ratio (:177).

**Rules.** Estimate, never UNKNOWN: a state opens on its own sourced figure, and a derived figure is marked as an estimate with its source. One rule, all 56 places: the fix is in the rule, never a named state.

**Done when.** The M1-03 command's opening clause passes for all 52 states and 78 metros in a place drawn from all 56 (place and seed in the PR body), and a test fails when a state's opening unemployment is taken from a metro.

**Files.** src/core2/regional-model.ts

**Notes.** Found by the M0-M2 lead's M1 helper, Oct 24. Blocks roadmap M1-03.
