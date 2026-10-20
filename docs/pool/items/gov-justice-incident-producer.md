---
id: gov-justice-incident-producer
title: "Stops, fights and carried weapons arise as incident records from causes already in the world"
area: gov
kind: feature
priority: 2
size: M
status: claimed
claimed-by: claude/political-game-pool-yucp92-qq
pr:
blocked-on:
source: split from gov-justice-incident-records (M, really L) by the claiming session, Oct 19
claimed-at: 2026-10-20T04:53:20.573Z
---

**What.** The justice engine hears only officials' bribery cases, so no defendant, complainant or weapon exists for five laws to act on. Add one incident record type that arises from causes already in the world: a police stop from the town's patrol hours and crime outcomes, a fight from two people's recorded grievance, and a carried weapon from a household's recorded firearm ownership. Each record names the people involved, the place, the date and the cause record that earned it, and nothing is drawn by a percentage roll.

**Rules.** No dice: no roll decides a charge or ruling; traits, evidence, the law in force and relationships do. An effect is a read, not a record: the engine reads the law at the moment it decides, and a recorded flag nobody reads does not count. One rule, all 56 places: the law rows are place data, with no place named in code. One model, two tiers: counted people meet the same rule as full people times their count.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body), a new test src/core2/justice-incidents.test.ts shows stop, fight and carried-weapon incident records, each citing its cause record id and naming real people by record id, and a year without the cause produces none.

**Files.** src/core2/modules/justice.ts, src/core2/justice-chain.ts, src/core2/justice-incidents.ts (new), src/core2/data/justice/ (new)

**Notes.** Closes the incident prerequisite of the five SG-GOV-REACH-A rows in src/core2/data/stopgaps.json only when the engine reads the law, never by deleting the row. Check docs/coordination/DECISION-REGISTER.md and OWNER-DECISIONS.md before adding any player-facing step. Remainder of gov-justice-incident-records.
