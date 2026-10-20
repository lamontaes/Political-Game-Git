---
id: people-corruption-honest-pull-calibrated
title: "A low-integrity official sometimes takes a bribe: corruption sums calibrated to honesty-humility"
area: people
kind: wiring
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** In most drawn towns every bribe offer is declined because the yes case never beats the honest pull of 3, so corruption take, tell, the justice chain and press tips never run in a played year. Weigh the stake against the official's own money need and calibrate the honest pull and the trait weight so the odds between the most and least honest thirds match Pletzer et al. 2019. Keep bribery rare in total, near the Global Corruption Barometer's six percent of people paying a bribe.

**Rules.** No dice: whether an official takes a bribe comes from their need, their tie and their traits, never a roll; Wire to the world: a taken bribe must reach justice and the press in a played year.

**Done when.** In a one-year buildBenchWorld run of a drawn place with a bill carrying employer costs, at least one bribe is taken by a low-integrity official and reaches a justice or press record by id, src/core2/corruption.test.ts and the trait-wiring audit show the calibrated odds between thirds.

**Files.** src/core2/modules/corruption.ts, src/core2/data/corruption/parameters.json

**Notes.** TODO

Measured Oct 20 (claude, released unbuilt). The target: Pletzer, Bentvelzen, Oostrom and de Vries 2019, Journal of Vocational Behavior 112:369-383 (doi 10.1016/j.jvb.2019.04.004), Table 1: HEXACO honesty-humility against workplace deviance, corrected rho -0.482 (95 percent interval -0.616 to -0.349), k = 15, N = 4,206, the strongest of the domains. Read from the paper's PDF, not from memory. Implied: with a rare outcome (6 percent), a latent propensity correlating 0.48 with the trait puts the least honest third at roughly four to six times the rate of the most honest third; the test should compute that ratio from the same latent model, not hard-code it.

What a played year shows today (a bill with employer costs from the interest-groups test, council vote, buildBenchWorld, seeds not chosen): four of five drawn towns saw no bribe offer at all; in the one with offers (US-NE, place key 3153835, seed ddadfa98...a401) five offers were made, the offer sums were all 2.86 against the honest pull of 3, yet the offers were recorded as made, and the five officials' take sums were -0.29, -0.26, -0.08, -0.03 and 0.74, so none took. The take sums top out at 0.74 because the need term is the bribe over a month's living costs plus cash on hand, which is small for an official with savings, so the honest pull of 3 is out of reach for everyone. A single pull is shared by offer and take (corruptionHonestPull); the two sums have different ranges, so one value cannot calibrate both.

What a builder needs: (1) a way to read the take decision for any adult without paying (split `takeValues` out of considerBribe, which should then call it: replace, not duplicate); (2) a calibration test that, for a town's adults and a typical in-play ask, orders them by the take sum and checks the least-honest-third against most-honest-third rate ratio and the overall rate against the Global Corruption Barometer 2019 (6 percent of Americans paid a bribe, which bounds offers, not takes); (3) separate offer and take pulls, tagged TUNABLE with the spread they were checked against. Too little data to set the numbers from a handful of played towns; set them from the town-wide order, not from the officials who happened to be asked.
