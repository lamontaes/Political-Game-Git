---
id: core-stopgap-opening-private-tuition-aggregate-spending
title: "Stopgaps in opening-private-tuition (aggregate-spending): 1 open"
area: core
kind: stopgap
priority: 3
status: open
claimed-by:
pr: #5294
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/opening-private-tuition.ts, kind aggregate-spending"
claimed-at:
after: core-private-tuition-yearly-reenrollment, core-private-tuition-counted, core-private-tuition-choice-reads-beliefs
---

**What.** This is the roll-up for the stopgap SG-CORE-private-tuition-average, which says that the town's best-off families are ranked by cash per child and enrolled at the opening until the NCES private share is reached, with no family choosing a school and enrollment fixed at the opening. The row closes when its three parts have landed: core-private-tuition-yearly-reenrollment (the August re-ranking that starts and ends tuition contracts), core-private-tuition-counted (counted families follow the same rule times their weight) and core-private-tuition-choice-reads-beliefs (faith, views, schools nearby and a child's needs enter the choice, per the owner's Oct 20 ruling). Then delete the means-ranked quota in `withPrivateTuition` (src/core2/opening-private-tuition.ts) and the `stopgap(data.stopgapId)` marker, and resolve the row in src/core2/data/stopgaps.json with the resolution naming the three parts.

**Rules.** Replace, never layer: the opening's means-ranked quota is deleted in the same change that the choice replaces it, not left beside it. Placeholders: the row is closed only because the mechanic is built, never by deleting it. One model, two tiers: the proof covers both a full family and a counted group. An effect is a read, not a record: a tuition contract must be read by the finance engine as a household payment to the school. No dice: the NCES share checks the town total and never picks a family.

**Done when.** After the three parts are done, a one-year run of buildBenchWorld in a drawn place from all 56 with a private school (place and seed named in the PR body, a seed the builder did not choose) shows no stopgap hit for SG-CORE-private-tuition-average, tuition paid by a full and a counted family by finance contract and journal record id, the row resolved in stopgaps.json, and src/core2/opening-private-tuition.test.ts plus the tripwire tests in src/core2/tooling/tripwires.test.ts pass.

**Files.** src/core2/opening-private-tuition.ts, src/core2/data/opening-private-tuition.json, src/core2/data/stopgaps.json, src/core2/opening-private-tuition.test.ts

**Notes.** First row: Each household with school-age children pays its children's share of the town's private tuition (the national private share times the average tuition) to the town's private school; no family chooses a school, and no chil

Oct 20 (pool feeder): spec written; the row was already split into three parts; the owner's Oct 20 school ruling is now a built part (new item core-private-tuition-choice-reads-beliefs), so people-school-choice-views-and-nearby is answered and its question can be closed.
