---
id: people-births-ready-couples-conceive-at-once
title: "Every couple ready for a child conceives at its next review, so births run about 1.3 times the state rate and a town's ready couples arrive as one wave"
area: people
kind: bug
priority: 3
size: S
status: dropped
claimed-by:
pr:
blocked-on: people-births-ready-couples-conceive-at-once-part-1-re-measure, people-births-ready-couples-conceive-at-once-part-2-conception-timing, people-births-ready-couples-conceive-at-once-part-3-women-without-partner, people-births-ready-couples-conceive-at-once-part-4-age-shape-by-place
after: people-births-over-state-rate-small-town, people-full-couples-plan-share-fell, web-calibrate-choice-terms
source: added with npm run pool -- add
standard: 2
model: sonnet
effort: low
root: none
lead: lives
checked: fable 2026-11-10
---

**What.** After the births calibration, M1-09's births test passes in Roche Harbor, Washington and five more drawn places, but births still total about 1.3 times the test's expectation (28 against 21.7), and Concord, Illinois sits near its upper limit with 9 against 3.39. The plan decision flips to 'plan' once a couple's score is above zero, and the renewal module reconstructs every ready couple's pregnancy at the opening, so about 25 ready couples in Roche Harbor all conceive at once. Other days measured births about ten times too few and the plan share down to 1.6 percent, so a fresh measurement on main comes first. The fix is split into four parts.

**Cause.** Measured: Roche Harbor, Washington (5359075, seed 2cff037427070ab820471240abf093b2a383133b4fe484274019a40fd2076e26) 28 births against 21.7 expected; Concord, Illinois (1716054, seed 99f462cf428e4898d2861e98e43f4079d0ca4a485b604ed49d569c4bcc5d90a9) 9 against 3.39 (item, Oct 25). Code: chooseBirthPlan in src/core2/births-plan.ts and initialize in src/core2/modules/renewal.ts.

**Fix.** Re-measure full births by age band on current main (part 1); make a couple's conception time follow their circumstances and the mother's age on a sliding scale (part 2); let a full woman with no recorded partner plan from her own record (part 3); and weigh a mother's age against her own place's schedule (part 4). The folded-in done-when lines in the Notes are part of the acceptance.

**Time box.** 2 hours for one Sonnet session, the closing check after the parts. When it runs out, write what was seen in the item and stop.

**Rules.** No dice and sliding scales: how soon a couple has a child follows their own circumstances and age on a sliding scale, never a yearly chance; the state's real birth rate only checks the town's total. One model, two tiers: counted women follow the same rule. Owner's Oct 24 ruling: time to conception is a sourced average by mother's age with the couple's circumstances on a sliding scale.

**Done when.** A second session runs a one-year played world (buildBenchWorld) in Roche Harbor, Washington and Concord, Illinois (seeds above) and three more drawn places named with seeds, and sees full births spread over the year by couples' circumstances, women with no partner planning, and plan records naming the change that prompted them. The births total is reported beside the expectation, and the cause is named by line in the PR.

**Waits on.** Its four parts: people-births-ready-couples-conceive-at-once-part-1-re-measure, people-births-ready-couples-conceive-at-once-part-2-conception-timing, people-births-ready-couples-conceive-at-once-part-3-women-without-partner and people-births-ready-couples-conceive-at-once-part-4-age-shape-by-place. The owner's ruling on time to conception is in docs/coordination/OWNER-DECISIONS.md (acting CTO rulings, Oct 24). The after: line names people-full-couples-plan-share-fell, proposed to merge here.

**Files.** src/core2/births-plan.ts, src/core2/modules/renewal.ts, src/core2/data/renewal/parameters.json, src/core2/births-counted.ts, data/research/renewal/natality-2024.json, scripts/research/people-parameters-check.ts, src/core2/data/stopgaps/m1.json

**Notes.** TODO

Folded in Oct 25 from people-births-age-shape-narrow. Its done when: In three drawn one-year buildBenchWorld runs, full women's births per thousand in each 5-year band from 20 to 44 fall within the Poisson spread of the CDC band count, shown by birth record ids, in src/core2/births-full-coverage.test.ts.

Folded in Oct 25 from people-renewal-renewalReviewDays-as-cause. Its done when: In a one-year run of the played world (buildBenchWorld, a drawn place from all 56, seed named), every renewal plan record (core2-renewal-v1 plans, id coupleId:plan:date) names the record whose change prompted its review, no plan is dated by a 91-day step alone, and src/core2/births-plan.test.ts gains a test that a job loss prompts a review on its day; renewalReviewDays is removed or kept only as a registered fallback.

Folded in Oct 25 from people-births-age-shape-by-place. Its done when: In a one-year run of the played world (buildBenchWorld, two drawn places from all 56 with different schedules, seeds named), each full couple's renewal plan record carries the age center and spread of its own place, src/core2/births-plan.test.ts shows the same couple's age term differs between the two places, and the town's mean age of mothers at birth is reported against its place's NCHS schedule.

Deferred Oct 25: nothing on screen reads it yet.

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). A roll-up of four parts; the parts a player can see (re-measure, women without a partner) stand on their own items.
