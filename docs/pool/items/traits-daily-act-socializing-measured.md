---
id: traits-daily-act-socializing-measured
title: "Seeing someone today weighs extraversion at the size a time-use study gives"
area: people
kind: wiring
priority: 2
size: S
status: dropped
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: traits
model: sonnet
effort: medium
root: none
source: added with npm run pool -- add
claimed-at:
checked: fable 2026-11-10
---

**What.** The daily chooser (life.daily-act) weighs every trait's pull on each act at the general weight of 1, and the audit found personality turned 14.8% of 29,520 picks with no study to compare.

Newton, Pladevall-Guyer, Gonzalez and Smith (2018, Health and Retirement Study 2012, N = 5,484) give extraversion an odds ratio of 1.41 per point of a 1-to-4 scale (standard deviation 0.57) on socializing with someone other than a partner on a given day, a log odds gap of 0.43 between the thirds. Rohrer and Lucas (2018) find a larger r of 0.18 in German diaries, and both find extraversion unrelated to how long people socialize.

**Cause.** Found in code: src/core2/data/parameters.json traitWeightLifeDailyAct is 1 (TUNABLE, line 5821) and data/research/trait-effect-sizes.json row life.daily-act (line 918) is empty (effect null, no source). The item's Notes quote Newton et al. 2018 (odds ratio 1.41 per scale point, SD 0.57, log odds gap 0.43 between thirds).

**Fix.** Add the Newton et al. 2018 row with its quote, refit traitWeightLifeDailyAct with scripts/traits/trait-calibrate.ts over two drawn places' played days, add src/core2/life-daily-act.traits.test.ts (new) beside the other trait tests using src/core2/trait-test-kit.ts, and remove the life.daily-act gap row.

**Time box.** 4 hours for one Sonnet session.

**Rules.** No dice: the trait weighs one reason in the chooser's scores, never a roll. Wire to the world: measured in played days of drawn places from all 56, every pick that offered a visit read with and without the trait term, place and seed named.

**Done when.** A second session sees the research row for life.daily-act with the Newton et al. 2018 quote, traitWeightLifeDailyAct refitted and tagged ESTIMATED with that source, and the life.daily-act gap row gone; over the picks that offered a visit to a known person in two drawn places' played days (seeds named) the third leaning most toward the visit and the third leaning least are compared by net log odds, which is reported beside the study's 0.43 and the test life-daily-act.traits.test.ts passes on a fresh draw.

**Waits on.** Nothing.

**Files.** src/core2/data/parameters.json, data/research/trait-effect-sizes.json, data/content/trait-decision-gaps.json, src/core2/trait-test-kit.ts, scripts/traits/trait-calibrate.ts, src/core2/life-daily-act.traits.test.ts (new)

**Notes.** Filed Oct 26 by the traits lead; a helper fetched and quoted both studies (scratch research notes); the pick data pull is queued.

Oct 29 (CTO, second account): claim released; the session that held it ended with the Oct 19 to 29 crews. Branch `claude/traits-daily-act` is kept; claiming this item takes it over.

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have weighed extraversion on seeing someone at a time-use study's size; no player can tell.
