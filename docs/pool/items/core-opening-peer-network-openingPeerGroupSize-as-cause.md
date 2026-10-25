---
id: core-opening-peer-network-openingPeerGroupSize-as-cause
title: "School peer groups split in half when a cohort passes the peer group size"
area: core
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** buildOpeningPeerContacts in src/core2/opening-peer-network.ts splits each recorded school cohort into Math.ceil(cohort / openingPeerGroupSize) balanced groups, so a cohort of 20 named people forms one group of 20 and a cohort of 21 forms two groups of 10.5: one more classmate halves everyone's remembered peers. In the Owings, Maryland year (seed 38e6252af62e) the 71 generated groups averaged 14.9 people, from 2 to 20, and 44 of them sat below the real class sizes of 16.9 to 22.0 students (NCES National Teacher and Principal Survey 2020-21, data/research/core/nces-ntps-2021-class-size.json). Replace the ceiling with a rule that varies smoothly with the cohort, so no single classmate flips the partition. The parameter's other read, countedKnown in src/core2/modules/candidacy.ts, is a count and stays as it is.

**Rules.** Sliding scales and causes: nothing flips at a threshold, and today one extra cohort member halves every peer group in that cohort. One model, two tiers: a person filled in later must still get the same classmates the opening built, through the peerCohortSize callback in fillInPerson.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place and a seed the builder did not choose), generated school peer groups (social:generated-school-acquaintance facts, by peerGroupId) for cohorts larger than a class average within 16.9 to 22.0 people, printed by scripts/research/deep-past-year.ts, and a test beside src/core2/opening-peer-network.test.ts shows that a cohort one member larger does not halve its groups.

**Files.** src/core2/opening-peer-network.ts,src/core2/opening-peer-network.test.ts

**Notes.** TODO
