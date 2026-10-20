---
id: people-partnership-rates-check
title: "A played year's partnerships, separations and leavings per thousand residents are checked against CDC and ACS rates"
area: people
kind: wiring
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
after: people-partnership-counted
source: added with npm run pool -- add
claimed-at:
---

**What.** Check a played year's partnership totals against real rates, and tune only what lies outside them. Run a year of the played world in six drawn places and count, per thousand residents of the right age band, young adults leaving a parent's home, new partnerships and separations, for full people and the counted tier together. Compare them with the published figures: the ACS share of 25 to 34 year olds living with a parent, the CDC marriage and divorce rates per thousand, and the ACS marital events in the last year (B12503, B13010). The weights in `src/core2/data/partnerships/parameters.json` move only where a total falls outside its sourced range, and each weight's checked spread goes in its parameter row.

**Rules.** Research before building: every figure cites its source, year and spread, and real rates check totals and never decide one actor's outcome. No dice: tuning changes a weight, never adds a random step. One rule, all 56 places: the check draws places from all 56 and names each place and seed. Every number lives in the parameter table, tagged SOURCED, ESTIMATED or TUNABLE with the spread it was checked against. Replace, never layer: the baseline notes in the stopgap rows SG-PEOPLE-home-leaving-weights, SG-PEOPLE-partnership-weights and SG-PEOPLE-separation-weights are resolved by the sourced ranges.

**Done when.** A script beside scripts/core2-year/moves-rate-check.ts prints, for six places drawn from all 56 with seeds the builder did not choose, each rate per thousand against its sourced range from a one-year buildBenchWorld run, and a test in src/core2/partnership-rates.test.ts reads the parameter rows by id and fails when a drawn place's total lies outside the range recorded there.

**Files.** scripts/core2-year/partnership-rate-check.ts, src/core2/data/partnerships/parameters.json, src/core2/partnership-rates.test.ts, src/core2/data/stopgaps.json

**Notes.** Follows people-partnership-counted. The weights in the parameter file are TUNABLE with their baselines marked in the stopgap rows SG-PEOPLE-home-leaving-weights, SG-PEOPLE-partnership-weights and SG-PEOPLE-separation-weights; the rates are the data that retire them.

Oct 20 (pool feeder): spec written; scripts/core2-year/moves-rate-check.ts exists on main as the model for the script; the partnership parameter file and rows come from the unmerged partnership stack, so this waits on people-partnership-counted (and through it the leaving, forming and ending items).
