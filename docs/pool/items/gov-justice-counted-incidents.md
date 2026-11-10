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
lead: governing
standard: 2
model: opus
effort: high
root: design-one-model-two-tiers
---

**What.** Once the incident producer writes stop, fight and carried-weapon incidents for full people from patrol hours, the crime measure, recorded grievances and household firearm ownership, give the counted tier the same events. Read each counted group (`src/core2/counted-groups.ts`: place, district, household kind, income band, tenure, head's age and work) with the producer's rule times the group's member count, summing fractional counts the way `reachOf` in `src/core2/counted-reach.ts` does, and write them as one group incident row per group per month that names the group record id, the cause record ids and the count, with no person until one is filled in.

**Cause.** Found in code: `src/core2/counted-groups.ts` (group rows) and `src/core2/counted-reach.ts` `reachOf` (line 147, fractional counts) exist; the incident producer it multiplies (`src/core2/justice-incidents.ts`) does not exist yet.

**Fix.** Apply the incident producer's rule to each counted group times its member count and write one group incident row per group per month citing cause record ids, acting on the month a cause changed through the producer's index.

**Time box.** 8 hours for one opus session.

**Rules.** One model, two tiers: the producer's rule is called for a group exactly as for a person, times the count, with no second formula for counted people. No dice: counts come from the patrol hours, the crime measure and the group's grievances and gun households, never a rate drawn per member. Speed: act on the month the cause changed through the producer's index and never scan every counted member every day. Estimate, never UNKNOWN: a group's exposure starts from the real average by age and income band with a spread in the parameter table.

**Done when.** A second session plays a one-year world (`buildBenchWorld`, every module) in a place drawn from all 56 with a seed the builder did not choose (both named) and sees the sum of full-person incidents and group incident rows equal the producer's rule applied to every resident, a group row cite its cause record ids, and a year with a patrol-hours cut show the counted incident count move; `src/core2/justice-counted.test.ts` proves it.

**Waits on.** gov-justice-incident-producer.

**Files.** src/core2/justice-incidents.ts (new), src/core2/counted-reach.ts, src/core2/counted-groups.ts, src/core2/justice-counted.test.ts (new)

**Notes.** Oct 20 (pool feeder): part 1 of 3 of gov-justice-counted-cases.
