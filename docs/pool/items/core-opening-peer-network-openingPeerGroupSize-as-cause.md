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
claimed-at:
---

**What.** buildOpeningPeerContacts in src/core2/opening-peer-network.ts splits each recorded school cohort into Math.ceil(cohort / openingPeerGroupSize) balanced groups, so a cohort of 20 named people forms one group of 20 and a cohort of 21 forms two groups of 10.5: one more classmate halves everyone's remembered peers. In the Owings, Maryland year (seed 38e6252af62e) the 71 generated groups averaged 14.9 people, from 2 to 20, and 44 of them sat below the real class sizes of 16.9 to 22.0 students (NCES National Teacher and Principal Survey 2020-21, data/research/core/nces-ntps-2021-class-size.json). Replace the ceiling with a rule that varies smoothly with the cohort, so no single classmate flips the partition. The parameter's other read, countedKnown in src/core2/modules/candidacy.ts, is a count and stays as it is.

**Rules.** Sliding scales and causes: nothing flips at a threshold, and today one extra cohort member halves every peer group in that cohort. One model, two tiers: a person filled in later must still get the same classmates the opening built, through the peerCohortSize callback in fillInPerson.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place and a seed the builder did not choose), generated school peer groups (social:generated-school-acquaintance facts, by peerGroupId) for cohorts larger than a class average within 16.9 to 22.0 people, printed by scripts/research/deep-past-year.ts, and a test beside src/core2/opening-peer-network.test.ts shows that a cohort one member larger does not halve its groups. **On screen.** None by design: this is a check, a speed or tooling change, or a cleanup; the player notices only that the game keeps running and the numbers stay believable.

**Files.** src/core2/opening-peer-network.ts,src/core2/opening-peer-network.test.ts

**Notes.** TODO

Analysis (Claude worker, Oct 27; released unbuilt). The groups are hash buckets: each member's bucket is `hash(person) mod groupCount` with `groupCount = ceil(cohortSize / size)` (src/core2/opening-peer-network.ts:218), so bucket sizes are binomial around cohortSize/groupCount, and the count steps at every multiple of the size. No integer group count can keep every cohort inside the class band of 16.9 to 22.0 (a cohort of 23 to 33 fits one group above 22 or two below 17), so "within the band" can hold only on average, and any partition into groups flips somewhere when one classmate is added; a smoother rule needs overlapping circles, not groups. The fit-in-place design is a ring: each person's position is a hash fraction u of (seed, version, context key, person id); two people are peers when their circular distance is at most size / (2 * cohortSize), so the window shrinks continuously as the cohort grows (a cohort at or under the size are all peers), and a person filled in later gets the same peers because the rule reads only the two ids and the cohort size from `peerCohortSize`. Each contact would carry its own id as `peerGroupId` (the contact id, not a bucket), `peerGroupMembers` would be the expected circle size (about `size`), and `scripts/research/deep-past-year.ts` and `opening-peer-network.test.ts` (which assert stable named groups and rows by group) read groups, so both change with it. Estimated at more than the 3-hour box: it replaces the group data shape. Whoever takes it should split it into the ring rule with its test and the report and fixture changes.

