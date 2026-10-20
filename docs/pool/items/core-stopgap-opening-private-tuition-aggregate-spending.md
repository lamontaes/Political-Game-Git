---
id: core-stopgap-opening-private-tuition-aggregate-spending
title: "Stopgaps in opening-private-tuition (aggregate-spending): 1 open"
area: core
kind: stopgap
priority: 3
status: claimed
claimed-by: claude/tuition-faith
pr: #5294
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/opening-private-tuition.ts, kind aggregate-spending"
claimed-at: 2026-10-20T10:11:36.360Z
---

**What.** This is the roll-up for the stopgap SG-CORE-private-tuition-average, which says that the town's best-off families are ranked by cash per child and enrolled at the opening until the NCES private share is reached, with no family choosing a school and enrollment fixed at the opening. The row closes when its three parts have landed: core-private-tuition-yearly-reenrollment (the August re-ranking that starts and ends tuition contracts), core-private-tuition-counted (counted families follow the same rule times their weight) and core-private-tuition-choice-reads-beliefs (faith, views, schools nearby and a child's needs enter the choice, per the owner's Oct 20 ruling). Then delete the means-ranked quota in `withPrivateTuition` (src/core2/opening-private-tuition.ts) and the `stopgap(data.stopgapId)` marker, and resolve the row in src/core2/data/stopgaps.json with the resolution naming the three parts.

**Rules.** Replace, never layer: the opening's means-ranked quota is deleted in the same change that the choice replaces it, not left beside it. Placeholders: the row is closed only because the mechanic is built, never by deleting it. One model, two tiers: the proof covers both a full family and a counted group. An effect is a read, not a record: a tuition contract must be read by the finance engine as a household payment to the school. No dice: the NCES share checks the town total and never picks a family.

**Done when.** After the three parts are done, a one-year run of buildBenchWorld in a drawn place from all 56 with a private school (place and seed named in the PR body, a seed the builder did not choose) shows no stopgap hit for SG-CORE-private-tuition-average, tuition paid by a full and a counted family by finance contract and journal record id, the row resolved in stopgaps.json, and src/core2/opening-private-tuition.test.ts plus the tripwire tests in src/core2/tooling/tripwires.test.ts pass.

**Files.** src/core2/opening-private-tuition.ts, src/core2/data/opening-private-tuition.json, src/core2/data/stopgaps.json, src/core2/opening-private-tuition.test.ts

**Notes.** First row: Each household with school-age children pays its children's share of the town's private tuition (the national private share times the average tuition) to the town's private school; no family chooses a school, and no chil

Oct 20 (pool feeder): spec written; the row was already split into three parts; the owner's Oct 20 school ruling is now a built part (new item core-private-tuition-choice-reads-beliefs), so people-school-choice-views-and-nearby is answered and its question can be closed.

Oct 20 (claude): unblocked. The yearly re-ranking (#5504) and the counted families in it (#5633) are in PR, so what is left of SG-CORE-private-tuition-average is the owner ruling (OWNER-DECISIONS, Private school #5483): beliefs, the schools nearby and a child needs decide, not only money. Plan: add a belief term to the August ranking score from the household head view on `education.public-funds-for-private-schooling` (`viewOn` with `personLean`, which already calibrates over counted voters through `countedSources`; a counted head is built with `store.personInput` once a year), a schools-nearby term from the private schools in town (and the public school the child attends), and a needs term from the child records. Missing before building: a SOURCED size for how far belief shifts enrollment (for example NHES or PSS enrollment by parent faith or political lean); without it the weights would be invented numbers. Research that first (research-habit), then build; the ranking code is `reenrollPrivateTuition` in private-tuition-reenroll.ts and `countedSchoolFamilies` in modules/residents.ts.

Oct 20 (claude, claude/tuition-choice, released unbuilt): first search for a sourced size found that about 80 percent of private students attend religiously affiliated schools, about half of them Catholic (NCES Digest Table 205.45, fall 1999, 2011 and 2021; Table 205.30 gives orientation by student characteristics for 2009 and 2011), and that the enrollment rate rises with family income percentile (CPS, VoxEU "US private schools increasingly serve affluent families"). So the belief term is the household faith group (the profile fact `PROFILE_FACT_KINDS.faith`, read for counted members the way `countedEngagement` does), not political lean, and the schools-nearby term needs each private school orientation (no field on the organization yet). Still missing: the enrollment rate of religious against non-religious families (NHES 2019 parent-reported tables) to size the weight, and the orientation split per town. Fetch NHES 2019 Table 3 or the PSS, then build.
