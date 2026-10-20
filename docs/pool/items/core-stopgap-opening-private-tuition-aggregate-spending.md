---
id: core-stopgap-opening-private-tuition-aggregate-spending
title: "Stopgaps in opening-private-tuition (aggregate-spending): 1 open"
area: core
kind: stopgap
priority: 3
status: open
claimed-by:
pr: #5294
blocked-on: core-private-tuition-yearly-reenrollment
milestone:
source: "src/core2/data/stopgaps.json, src/core2/opening-private-tuition.ts, kind aggregate-spending"
claimed-at:
---

**What.** Replace or clear the 1 open aggregate-spending stopgap row(s) in src/core2/opening-private-tuition.ts: SG-CORE-private-tuition-average. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/opening-private-tuition.ts

**Notes.** First row: Each household with school-age children pays its children's share of the town's private tuition (the national private share times the average tuition) to the town's private school; no family chooses a school, and no chil

Oct 20 (claude): unblocked. The yearly re-ranking (#5504) and the counted families in it (#5633) are in PR, so what is left of SG-CORE-private-tuition-average is the owner ruling (OWNER-DECISIONS, Private school #5483): beliefs, the schools nearby and a child needs decide, not only money. Plan: add a belief term to the August ranking score from the household head view on `education.public-funds-for-private-schooling` (`viewOn` with `personLean`, which already calibrates over counted voters through `countedSources`; a counted head is built with `store.personInput` once a year), a schools-nearby term from the private schools in town (and the public school the child attends), and a needs term from the child records. Missing before building: a SOURCED size for how far belief shifts enrollment (for example NHES or PSS enrollment by parent faith or political lean); without it the weights would be invented numbers. Research that first (research-habit), then build; the ranking code is `reenrollPrivateTuition` in private-tuition-reenroll.ts and `countedSchoolFamilies` in modules/residents.ts.

Oct 20 (claude, claude/tuition-choice, released unbuilt): first search for a sourced size found that about 80 percent of private students attend religiously affiliated schools, about half of them Catholic (NCES Digest Table 205.45, fall 1999, 2011 and 2021; Table 205.30 gives orientation by student characteristics for 2009 and 2011), and that the enrollment rate rises with family income percentile (CPS, VoxEU "US private schools increasingly serve affluent families"). So the belief term is the household faith group (the profile fact `PROFILE_FACT_KINDS.faith`, read for counted members the way `countedEngagement` does), not political lean, and the schools-nearby term needs each private school orientation (no field on the organization yet). Still missing: the enrollment rate of religious against non-religious families (NHES 2019 parent-reported tables) to size the weight, and the orientation split per town. Fetch NHES 2019 Table 3 or the PSS, then build.
