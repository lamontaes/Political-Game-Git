---
id: jobs-graduation-pay-test-draws-until-a-hire
title: "The graduation-pay test passes without its pay and income assertions when six draws find no hire"
area: world
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
lead: jobs
model: sonnet
effort: low
root: rc8-law-judged-by-paperwork
source: found by Account lead T5 in PR #8969 (Nov 13, 2026)
checked: Account lead T5 2026-11-13
---

**What.** `src/core2/jobs-graduation-income.test.ts` draws six places and, if none shows a senior who graduates only where graduation was raised and is hired in both worlds, prints the counts and passes without reaching its diploma-pay and household-income assertions. On GRADUATION_PAY_SEED=14ae4b10218eb955fb06cb278f273c38046af56e that happens on clean main and on the school-aid branch (Decherd TN, Aunu'u AS, Pumpkin Center NC, G. L. Garcia PR, Hoonah AK, Ledgewood NJ: flipped graduations in every place, zero matched hires by 2026-01-20). Guards: the hire-pay and household-income chain staying proved by a test that reaches its assertions.

**Cause.** Measured: Decherd, Tennessee, seed e6c1f176702e0edd56c4583043ecea29e85b8ef639e669f92998b39359473e4d (draw 1 of GRADUATION_PAY_SEED=14ae4b10218eb955fb06cb278f273c38046af56e): 5 seniors graduate only where raised and none is hired in both worlds. In those draws graduation flips in the raised world, but no flipped senior is hired to the same position (or one posted at the same pay for the same occupation) in both worlds inside the 365 days the loop plays, so `pairs` stays empty and the loop ends at the line that writes "no drawn place showed a senior ..." and falls through (src/core2/jobs-graduation-income.test.ts, end of the `it`). A pass that never reached its assertions is a hole.

**Fix.** Draw up to 16 places, log each seed before its world builds, stop at the first place that shows a matched hire, and throw naming every seed tried if none does. Tried on PR #8969 head 930e7772 and taken out because the loop ran 1,915 s in CI and starved `school-aid.test.ts` into its 1,800,000 ms timeout; so cut the cost first: play each draw only to the senior hire window (graduation day to the first posting month) and draw places with many seniors first, or run the file alone in CI.

**Time box.** 3 hours for one session of the Sonnet model. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Do not weaken or skip the pay and household-income assertions. No dice: the draw order comes from the seed. Tests draw places from all 56 and print the place and seed.

**Done when.** A second session (not the builder) runs the test in drawn places (place and seed named in its output, as the witness seeds below show) and sees it either reach the pay and household-income assertions or throw naming the seeds tried. The test, run on GRADUATION_PAY_SEED=14ae4b10218eb955fb06cb278f273c38046af56e and on two fresh seeds, either reaches the pay and household-income assertions or throws naming the seeds tried, and finishes in under 15 minutes alone. Witness seeds from PR #8969: Shawneeland, Virginia, seed 133d3eb98c8108f74eec1f0fd7284cdeb65e9b4507dbb800389275aaef7acc62 (hire at 1,805 cents an hour against 1,682, household income 7,732,701 against 7,460,046 cents a year, passes); Gainesville, Virginia, seed 11c6861155375efd4f23ff83488177f64002f058226f98097ebdda6830f6bd52 (reaches a hire, then throws `Cannot read properties of undefined (reading 'hourlyMinor')` at the regional-hire posting root the Red desk owns).

**Waits on.** The Red desk's regional-hire root (`hourlyMinor` TypeError at src/core2/jobs-graduation-income.test.ts line 262 on main).

**Files.** src/core2/jobs-graduation-income.test.ts

**Notes.** Found by Account lead T5 in PR #8969.
