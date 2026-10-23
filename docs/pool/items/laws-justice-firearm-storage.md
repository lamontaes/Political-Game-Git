---
id: laws-justice-firearm-storage
title: "A child access prevention law reaches a gun owner whose child reaches the gun (SG-GOV-REACH-A-firearms)"
area: laws
kind: wiring
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
after: gov-justice-incident-producer
source: added with npm run pool -- add
claimed-at:
---

**What.** Make the child access prevention law (us-policy-positions:justice-public-safety.child-access-prevention) change what happens when a child reaches a household's gun. Household ownership already exists (householdOwnsFirearm in src/core2/firearm-ownership.ts, state survey rate from RAND 2020) and the law reach already limits the storage duty to adults in owning households with a child. Add the case the duty exists for: when the incident producer records a carried or reached weapon in an owning household with a child, the justice engine reads lawInForce and, where the law is in force, charges the adult who kept the gun (the household's oldest adult by record) with the misdemeanor the law row names, and where it is not in force no charge follows from the same facts.

**Rules.** An effect is a read, not a record: the charging step reads lawInForce on the incident date, so the storage duty changes a charge rather than sitting on the adult as a flag. No dice: the charge follows the incident facts, the household's firearm record and the law in force, never a roll. One rule, all 56 places: the law and each state's firearm rate are data and no place is named in code. One model, two tiers: counted owning households with a child are charged as a group by the same rule times their count. Ask why: the charge cites the incident id, the household id and the law row id.

**Done when.** In a one-year run of the played world (buildBenchWorld, every module installed) in a place drawn from all 56 with a seed the builder did not choose, a weapon incident in an owning household with a child ends in a charge against the named adult where the law is in force and in none where it is not, shown by incident id, household id, case record id and the law row id; src/core2/justice-incidents.test.ts proves it and src/core2/household-firearms.test.ts still passes.

**Files.** src/core2/modules/justice.ts, src/core2/firearm-ownership.ts, src/core2/law-reach/group-a-records.ts, src/core2/justice-incidents.test.ts

**Notes.** Oct 20 (pool feeder): spec written; the stopgap row SG-GOV-REACH-A-firearms is already resolved (firearm-ownership.ts, counted households by rate), so this is only the charge when a child reaches the gun, which waits for the weapon incident from gov-justice-incident-producer.
