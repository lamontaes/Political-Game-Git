---
id: traits-research-own-sd
title: "Personality sizes from Mondak et al. convert with each trait's own standard deviation and quote their Table 2 cells"
area: people
kind: research
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The trait calibration converted Mondak et al. (2010) full-range coefficients with an assumed standard deviation of a fifth of the range, the rows quoted no table cell, and a debt-level study was read as a chance of borrowing. Give each Mondak row its Table 2 cell and standard error and its trait's Table 1 standard deviation, and make scripts/traits/trait-calibrate.ts refuse a full-range row without one and a pp-per-sd row whose outcome is not a probability.

**Rules.** Quotes are the paper's own text; no assumed constant stands in for a reported value; data/research/trait-effect-sizes.json only, plus the calibration script.

**Done when.** Every Mondak row quotes its cell and carries traitSd from Table 1; the calibration run warns for credit.borrow and gives voting.turnout a target from 0.22.

**Files.** data/research/trait-effect-sizes.json, scripts/traits/trait-calibrate.ts

**Notes.** TODO
