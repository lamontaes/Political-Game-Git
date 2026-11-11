---
id: laws-justice-firearm-storage
title: "A child access prevention law reaches a gun owner whose child reaches the gun (SG-GOV-REACH-A-firearms)"
area: laws
kind: wiring
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after: gov-justice-incident-producer
lead: laws
model: opus
effort: medium
root: rc8-law-judged-by-paperwork
source: added with npm run pool -- add
claimed-at:
checked: fable 2026-11-10
---

**What.** Make the child access prevention law change what happens when a child reaches a household's gun. Household ownership already exists (`householdOwnsFirearm`, state survey rate from RAND 2020), the law reach already limits the storage duty to adults in owning households with a child, and the public-safety engine already makes owning households with a child buy a lock. Add the case the duty exists for: when the incident producer records a carried or reached weapon in an owning household with a child, the justice engine reads `lawInForce` and, where the law is in force, charges the adult who kept the gun (the household's oldest adult by record) with the misdemeanor the law row names, and where it is not in force no charge follows from the same facts.

**Cause.** Design: AGENTS.md "An effect is a read" (owner, Oct 13) and the registered stopgap SG-GOV-REACH-A-firearms (src/core2/data/stopgaps/gov.json, already resolved). Found in code: `householdOwnsFirearm` (src/core2/firearm-ownership.ts, line 25) and the lock purchase in src/core2/public-safety.ts (child access prevention, line 1520) exist; no charge follows a child reaching a gun because the weapon incident (gov-justice-incident-producer) is not built.

**Fix.** When the incident producer records a weapon reached in an owning household with a child, have the justice engine read `lawInForce` and charge the household's oldest adult with the misdemeanor the law row names where the law holds; where it does not, no charge follows.

**Time box.** 4 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record: the charging step reads `lawInForce` on the incident date, so the storage duty changes a charge rather than sitting on the adult as a flag. No dice: the charge follows the incident facts, the household's firearm record and the law in force, never a roll. One rule, all 56 places: the law and each state's firearm rate are data and no place is named in code. One model, two tiers: counted owning households with a child are charged as a group by the same rule times their count. Ask why: the charge cites the incident id, the household id and the law row id.

**Done when.** A second session, not the builder, runs a one-year played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (both named). A weapon incident in an owning household with a child ends in a charge against the named adult where the law is in force and in none where it is not, shown by incident id, household id, case record id and the law row id; src/core2/justice-incidents.test.ts (new) proves it and src/core2/death-cause-firearm-homicide.test.ts still passes.

**Waits on.** gov-justice-incident-producer (the weapon incident record).

**Files.** src/core2/modules/justice.ts, src/core2/firearm-ownership.ts, src/core2/law-reach/group-a-records.ts, src/core2/public-safety.ts, src/core2/death-cause-firearm-homicide.test.ts, src/core2/justice-incidents.test.ts (new)

**Notes.** Oct 20 (pool feeder): spec written; the stopgap row SG-GOV-REACH-A-firearms is already resolved (firearm-ownership.ts, counted households by rate), so this is only the charge when a child reaches the gun, which waits for the weapon incident from gov-justice-incident-producer.
