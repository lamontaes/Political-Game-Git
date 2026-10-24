---
id: people-renewal-renewalReviewDays-as-cause
title: "Couples reconsider a child when their circumstances change, not every 91 days"
area: people
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The births plan in src/core2/modules/renewal.ts reviews every couple's choice to plan a child on a fixed 91-day cadence (renewalReviewDays in scheduleReview), so a pregnancy can only begin on a review day and a couple whose circumstances changed waits up to a quarter to weigh it. The number has no real-world counterpart to source: it is a fixed step, not an amount, so research-people-sourced-parameters left it TUNABLE. The review should be scheduled from causes the couple's own records carry: a birth, a job gained or lost, a move, a partnership starting, a condition recorded, or the day the timing pull turns in favor, read on the day that record changes. A slow fallback stays only where a cause cannot be indexed, registered as a stopgap.

**Rules.** Sliding scales and causes: nothing flips at a threshold and world events happen from causes, so a couple's decision is re-read when a record it weighs changes, not on a quarterly clock. No dice: no chance picks a pregnancy; the couple's own scores decide on the day they are re-read.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place from all 56, seed named), every renewal plan record (core2-renewal-v1 plans, id coupleId:plan:date) names the record whose change prompted its review, no plan is dated by a 91-day step alone, and src/core2/births-plan.test.ts gains a test that a job loss prompts a review on its day; renewalReviewDays is removed or kept only as a registered fallback.

**Files.** src/core2/modules/renewal.ts, src/core2/data/renewal/parameters.json, src/core2/data/stopgaps.json

**Notes.** TODO
