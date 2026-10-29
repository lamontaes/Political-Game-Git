---
id: traits-daily-act-socializing-measured
title: "Seeing someone today weighs extraversion at the size a time-use study gives"
area: people
kind: wiring
priority: 2
size: S
status: claimed
claimed-by: claude/traits-daily-act
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-26T05:19:40.765Z
---

**What.** The daily chooser (life.daily-act) weighs every trait's pull on each act at the general weight of 1, and the audit found personality turned 14.8% of 29,520 picks with no study to compare.

Newton, Pladevall-Guyer, Gonzalez and Smith (2018, Health and Retirement Study 2012, N = 5,484) give extraversion an odds ratio of 1.41 per point of a 1-to-4 scale (standard deviation 0.57) on socializing with someone other than a partner on a given day, a log odds gap of 0.43 between the thirds. Rohrer and Lucas (2018) find a larger r of 0.18 in German diaries, and both find extraversion unrelated to how long people socialize.

**Rules.** No dice: the trait weighs one reason in the chooser's scores, never a roll. Wire to the world: measured in played days of drawn places from all 56, every pick that offered a visit read with and without the trait term, place and seed named.

**Done when.** A research row for life.daily-act cites Newton et al. 2018 with its quote; traitWeightLifeDailyAct is refitted so that, over the picks that offered a visit to a known person in two drawn places' played days (seeds named), the third leaning most toward the visit chooses it at net log odds within a factor of 1.5 of 0.43 against the third leaning least; a trait test (life-daily-act.traits.test.ts) checks the size on a fresh draw; the life.daily-act gap row is removed.

**Files.** src/core2/data/parameters.json, data/research/trait-effect-sizes.json, data/content/trait-decision-gaps.json, src/core2/trait-test-kit.ts

**Notes.** Filed Oct 26 by the traits lead; a helper fetched and quoted both studies (scratch research notes); the pick data pull is queued.
