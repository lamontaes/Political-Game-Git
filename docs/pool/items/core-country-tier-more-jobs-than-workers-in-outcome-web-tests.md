---
id: core-country-tier-more-jobs-than-workers-in-outcome-web-tests
title: "The country tier's own check finds more jobs than workers in the outcome web's world tests"
area: core
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after: 
blocked-on:
lead: speed
model: opus
effort: medium
root: none
source: added with npm run pool -- add
---

**What.** On main (Nov 11), src/core2/outcome-web.test.ts fails in drawn places with the tier's bookkeeping check: 'The country tier holds counts that cannot be: US-IN: 3318085.2067525927 jobs for 3317720.325176492 workers' (Earl Park, Indiana, GOLDEN_PATH_SEED=3110f870cf52c299, test 'low birth weight reads the sized link to drinking-water violations'), and US-CO 2805771.97 jobs for 2805763.44 workers on the same seed in Silver Plume, Colorado. The excess is about 0.01 percent: a rounding or ordering slip in a month, not a runaway. Seen: dev mode's Run panel and Metrics tab. Guards: the tier's count check.

**Cause.** Needs cause. Measured: the failure above reproduces on clean main with that seed; which step of stepCountry (src/core2/country-model.ts) leaves jobs above workers is not found.

**Fix.** None until the cause is found.

**Time box.** 3 hours

**Rules.** Red main comes first (owner, Oct 15). Never weaken a check to get green. One rule, all 56 places.

**Done when.** GOLDEN_PATH_SEED=3110f870cf52c299 npx vitest run src/core2/outcome-web.test.ts passes on main in Earl Park, Indiana, and on two fresh draws, each place and seed named. A second session then starts the bench in a drawn place (written down with its seed), runs two years in dev mode's Run panel with dev mode's bookkeeping on, and sees no 'counts that cannot be' error and the Metrics tab's state rows with no more jobs than workers.

**Waits on.** Nothing.

**Files.** src/core2/country-model.ts, src/core2/modules/macro.ts, src/core2/outcome-web.test.ts
