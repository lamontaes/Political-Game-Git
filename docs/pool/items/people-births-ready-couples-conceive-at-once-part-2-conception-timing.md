---
id: people-births-ready-couples-conceive-at-once-part-2-conception-timing
title: "A couple's time to conception follows their circumstances and the mother's age"
area: people
kind: bug
priority: 3
size: M
status: dropped
standard: 2
claimed-by:
pr:
after: people-births-ready-couples-conceive-at-once-part-1-re-measure
blocked-on:
lead: lives
model: opus
effort: high
root: none
source: split from people-births-ready-couples-conceive-at-once in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** Every couple ready for a child conceives at its next review, so births run above the expectation in some towns and a town's ready couples arrive as one wave. src/core2/modules/renewal.ts reconstructs every ready couple's pregnancy at the opening, so about 25 ready couples in Roche Harbor all conceive at once. How long a ready couple takes to conceive should follow their score and the mother's age on a sliding scale, and a couple should reconsider a child when their circumstances change, not every 91 days.

**Cause.** Found in code: src/core2/births-plan.ts chooseBirthPlan (line 270) flips to 'plan' once a couple's score is above zero, and src/core2/modules/renewal.ts initialize (line 616) reconstructs each ready couple's pregnancy at the opening; renewalReviewDays reviews every 91 days.

**Fix.** Make a couple's conception time follow their circumstances and the mother's age on a sliding scale (a sourced average time to conception by mother's age, per the acting CTO's Oct 24 ruling), review a plan when a record of their life changes (a job loss prompts a review on its day) rather than on a 91-day step, and remove renewalReviewDays or keep it as a registered fallback.

**Time box.** 10 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice and sliding scales: how soon a couple has a child follows their own circumstances and age, never a yearly chance; the real birth rate checks the town's total only. Estimate, never UNKNOWN: the mean time to conception starts from a sourced average with its spread. One model, two tiers: counted women follow the same timing. Replace, never layer: one planning path.

**Done when.** A second session runs a one-year played world (buildBenchWorld) in Roche Harbor, Washington (seed 2cff037427070ab820471240abf093b2a383133b4fe484274019a40fd2076e26), Concord, Illinois (seed 99f462cf428e4898d2861e98e43f4079d0ca4a485b604ed49d569c4bcc5d90a9) and one more drawn place, and sees the couples ready at the opening conceive over the first months rather than on one date, each plan record (id coupleId:plan:date) naming the record whose change prompted its review. src/core2/births-plan.test.ts shows a job loss prompting a review on its day. The town's births are reported beside the CDC expectation.

**Waits on.** people-births-ready-couples-conceive-at-once-part-1-re-measure.

**Files.** src/core2/births-plan.ts, src/core2/modules/renewal.ts, src/core2/data/renewal/parameters.json, src/core2/births-plan.test.ts

**Notes.** Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have spread when ready couples conceive; no player sees a wave of conceptions at the opening, only the year's births, which part 1 and part 3 keep right.
