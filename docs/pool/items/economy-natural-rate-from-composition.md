---
id: economy-natural-rate-from-composition
title: "The normal unemployment rate follows the working-age mix, replacing the hysteresis parameter"
area: world
kind: feature
priority: 2
size: M
status: dropped
standard: 2
lead: money
claimed-by:
pr:
blocked-on:
model: opus
effort: medium
root: none
after: economy-recessions-from-causes
source: Money, Nov 8; Coordinator ruling on #7842
checked: fable 2026-11-10
---

**What.** The economy's normal unemployment rate (`naturalUnemploymentPct` on each macro month) drifts toward lived unemployment at an estimated speed (`macroNaturalHysteresisMonths`, 120, ESTIMATED), because no source publishes a hysteresis speed and CBO's natural-rate series (FRED NROU) does not follow lived unemployment (Money's fit: a slightly negative coefficient in every sample from 1960 to 2019). What that series does follow is structure: the fall from 6.2 percent in 1980 to 4.4 in 2019 tracks the working-age mix, since the young have higher unemployment and the baby boom aging out lowered it. Build the normal rate from the world's own working-age composition (age shares of the labor force from the population's records, by the same rule for named and counted people) and remove the hysteresis parameter.

**Cause.** Design: docs/coordination/OWNER-DECISIONS.md, the Nov 8 "Macro hysteresis" bullet (120 months, ESTIMATED), and the Coordinator's ruling on #7842 that the normal rate follows the working-age mix. `macroNaturalHysteresisMonths` is still read in `src/core2/macro-model.ts` (lines 146 and 371) and defined in `src/core2/data/macro/parameters.json` (line 452).

**Fix.** Build `naturalUnemploymentPct` from the labor force's age shares by one rule for named and counted people, delete `macroNaturalHysteresisMonths`, and keep the cause check in `macro.test.ts` passing.

**Time box.** 8 hours for one Opus session.

**Rules.** No dice; sliding scales and causes: the normal rate slides with the age mix, with no threshold. One model, two tiers: one rule for named and counted people. Research before building: real ranges are checked against, never steered to.

**Done when.** A second session plays the world in two places drawn from all 56 (names and seeds written down) and finds the normal rate moving with the labor force's age mix and not with a fitted speed, with `macroNaturalHysteresisMonths` gone from the code and the parameters. The opening's 12-month unemployment change is explained by records (the cause check in `macro.test.ts` still passes), and the second session reports the real figures beside the world's without treating them as a target.

**Waits on.** Nothing.

**Files.** src/core2/macro-model.ts, src/core2/modules/macro.ts, src/core2/data/macro/parameters.json, src/core2/macro.test.ts

**Notes.** Ruled by the Coordinator on #7842 as the real replacement for the hysteresis parameter. Not started.

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have replaced an estimated 120-month hysteresis number with a rate built from the working-age mix; no player reads the natural rate, and the estimate already moves the economy.
