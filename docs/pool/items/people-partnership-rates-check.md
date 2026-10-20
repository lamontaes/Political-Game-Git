---
id: people-partnership-rates-check
title: "A played year's partnerships, separations and leavings per thousand residents are checked against CDC and ACS rates"
area: people
kind: wiring
priority: 3
size: S
status: blocked
claimed-by:
pr:
blocked-on: people-partnership-counted (the partnership rules the check measures are not built yet; the item text is complete)
after: people-partnership-counted
source: added with npm run pool -- add
claimed-at:
---

**What.** The partnership rules (leaving a parent's home, forming a partnership and separating) are built on the weights of a person's own situation, so a played year's totals are unchecked against any real rate. Run a year of the played world in several places and compare the leavings, new partnerships and separations per thousand residents of the right ages with the published rates (the ACS share of 25 to 34 year olds living with a parent, the CDC marriage and divorce rates per thousand), as a check on the totals and never as a way to pick one person's outcome.

**Rules.** Research before building: every figure cites its source and spread. Real rates check totals and never decide one actor's outcome. No dice. One rule, all 56 places: the check draws places from all 56 and names place and seed.

**Done when.** A script beside `scripts/core2-year/moves-rate-check.ts` prints, for six drawn places and seeds the builder did not choose, each rate per thousand of the right age band against its sourced range, and the rules' weights in `src/core2/data/partnerships/parameters.json` are tuned only where a total lies outside the range, with the spread each weight was checked against recorded in the parameter row.

**Files.** scripts/core2-year/partnership-rate-check.ts, src/core2/data/partnerships/parameters.json

**Notes.** Follows people-partnership-counted. The weights in the parameter file are TUNABLE with their baselines marked in the stopgap rows SG-PEOPLE-home-leaving-weights, SG-PEOPLE-partnership-weights and SG-PEOPLE-separation-weights; the rates are the data that retire them.
