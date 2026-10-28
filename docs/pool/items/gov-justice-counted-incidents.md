---
id: gov-justice-counted-incidents
title: "Counted groups carry stop, fight and weapon incident counts by the same cause rule as full people"
area: gov
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
after: gov-justice-incident-producer
blocked-on:
milestone:
source: split from gov-justice-counted-cases by pool feeder Oct 20
---

**What.** Once the incident producer writes stop, fight and carried-weapon incidents for full people from patrol hours, the crime measure, recorded grievances and household firearm ownership, give the counted tier the same events. Read each counted group (src/core2/counted-groups.ts: place, district, household kind, income band, tenure, head's age and work) with the producer's rule times the group's member count, summing fractional counts the way reachOf in src/core2/counted-reach.ts does, and write them as one group incident row per group per month that names the group record id, the cause record ids and the count, with no person until one is filled in.

**Rules.** One model, two tiers: the producer's rule is called for a group exactly as for a person, times the count, with no second formula for counted people. No dice: counts come from the patrol hours, the crime measure and the group's grievances and gun households, never a rate drawn per member. Speed: act on the month the cause changed through the producer's index and never scan every counted member every day. Estimate, never UNKNOWN: a group's exposure starts from the real average by age and income band with a spread in the parameter table.

**Done when.** In a one-year run of the played world (buildBenchWorld, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the test output), the sum of full-person incidents and group incident rows equals the producer's rule applied to every resident, a group row cites its cause record ids, and a year with a patrol-hours cut shows the counted incident count move; src/core2/justice-counted.test.ts proves it.

**Files.** src/core2/justice-incidents.ts, src/core2/counted-reach.ts, src/core2/counted-groups.ts, src/core2/justice-counted.test.ts

**Notes.** Oct 20 (pool feeder): part 1 of 3 of gov-justice-counted-cases.
