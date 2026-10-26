---
id: people-births-ready-couples-conceive-at-once
title: "Every couple ready for a child conceives at its next review, so births run about 1.3 times the state rate and a town's ready couples arrive as one wave"
area: people
kind: bug
priority: 3
size: L
status: open
claimed-by:
pr:
blocked-on:
after: people-births-over-state-rate-small-town, people-full-couples-plan-share-fell, web-calibrate-choice-terms
source: added with npm run pool -- add
---

**What.** After the births calibration (branch claude/quirky-ride-vrwwz4-births), M1-09's births test passes in Roche Harbor, Washington (5359075, seed 2cff037427070ab820471240abf093b2a383133b4fe484274019a40fd2076e26) and five more drawn places, but births still total about 1.3 times the test's expectation (28 against 21.7), and Concord, Illinois (1716054, seed 99f462cf428e4898d2861e98e43f4079d0ca4a485b604ed49d569c4bcc5d90a9) sits near its upper limit with 9 against 3.39. The plan decision in src/core2/births-plan.ts flips to 'plan' once a couple's score is above zero, and src/core2/modules/renewal.ts initialize() reconstructs every ready couple's pregnancy at the opening, so about 25 ready couples in Roche Harbor all conceive at once. How long a ready couple takes to conceive (from their score and the mother's age) is the deeper fix; whether a sourced mean time to conception counts as a fixed percentage deciding an outcome needs the owner's word. Combined by the Oct 25 audit, one change in one seam; the parts folded in: people-births-age-shape-narrow (Births by age band follow the plan score's narrow age peak: 25 to 29 run about 5 times the CDC count and 35 to 44 run near zero, while the total is right); people-renewal-renewalReviewDays-as-cause (Couples reconsider a child when their circumstances change, not every 91 days); people-births-age-shape-by-place (The births plan weighs a mother's age against her own place's fertility schedule). Each part's own done-when line is listed in Notes and is part of this item's acceptance.

**Rules.** No dice and sliding scales: how soon a couple has a child follows their own circumstances and age on a sliding scale, never a yearly chance; the state's real birth rate only checks the town's total.

**Done when.** M1-09's births test passes in Roche Harbor, Washington and Concord, Illinois (seeds above) and three more drawn places named with seeds, with births within 15 percent of the expectation on average across them, the owner's ruling on time to conception cited, and the cause named by line in the PR.

**Files.** src/core2/births-plan.ts, src/core2/modules/renewal.ts, src/core2/data/renewal/parameters.json, src/core2/births-full-coverage.test.ts, src/core2/data/stopgaps.json, src/core2/births-counted.ts, data/research/renewal/natality-2024.json, scripts/research/people-parameters-check.ts

**Notes.** TODO

Folded in Oct 25 from people-births-age-shape-narrow. Its done when: In three drawn one-year buildBenchWorld runs, full women's births per thousand in each 5-year band from 20 to 44 fall within the Poisson spread of the CDC band count, shown by birth record ids, in src/core2/births-full-coverage.test.ts.

Folded in Oct 25 from people-renewal-renewalReviewDays-as-cause. Its done when: In a one-year run of the played world (buildBenchWorld, a drawn place from all 56, seed named), every renewal plan record (core2-renewal-v1 plans, id coupleId:plan:date) names the record whose change prompted its review, no plan is dated by a 91-day step alone, and src/core2/births-plan.test.ts gains a test that a job loss prompts a review on its day; renewalReviewDays is removed or kept only as a registered fallback.

Folded in Oct 25 from people-births-age-shape-by-place. Its done when: In a one-year run of the played world (buildBenchWorld, two drawn places from all 56 with different schedules, seeds named), each full couple's renewal plan record carries the age center and spread of its own place, src/core2/births-plan.test.ts shows the same couple's age term differs between the two places, and the town's mean age of mothers at birth is reported against its place's NCHS schedule.

Deferred Oct 25: nothing on screen reads it yet.
