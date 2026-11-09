---
id: economy-natural-rate-from-composition
title: "The normal unemployment rate follows the working-age mix, replacing the hysteresis parameter"
area: world
kind: feature
priority: 2
size: M
status: open
lead: money
claimed-by:
pr:
blocked-on:
after: economy-recessions-from-causes
source: Money, Nov 8; Coordinator ruling on #7842
---

**What.** The economy's normal unemployment rate (`naturalUnemploymentPct` on each macro month) drifts toward lived unemployment at an estimated speed (`macroNaturalHysteresisMonths`, 120, ESTIMATED), because no source publishes a hysteresis speed and CBO's own natural-rate series (FRED NROU) does not follow lived unemployment (Money's fit: a slightly negative coefficient in every sample from 1960 to 2019). What that series does follow is structure: the 6.2 percent peak in 1980 to 4.4 in 2019 tracks the working-age mix (the young have higher unemployment; the baby boom aging out lowered it). Build the normal rate from the world's own working-age composition (age shares of the labor force from the population's records, by the same rule for named and counted people) and remove the hysteresis parameter.

**Time box.** A day for a Sonnet builder after #7842 merges.

**Rules.** No dice; sliding scales; one rule for both tiers; real ranges are checked against, never steered to.

**Done when.** In a played world at two random places from all 56 (name place and seed), the normal rate moves with the labor force's age mix and not with a fitted speed, `macroNaturalHysteresisMonths` is gone, and the 2021 opening's 12-month unemployment change is explained by records (the cause check in `macro.test.ts` still passes).

**Files.** src/core2/macro-model.ts, src/core2/modules/macro.ts, src/core2/data/macro/parameters.json

**Notes.** Ruled by the Coordinator on #7842 as the real replacement for the hysteresis parameter. Not started.
