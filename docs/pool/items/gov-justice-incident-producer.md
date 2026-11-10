---
id: gov-justice-incident-producer
title: "Stops, fights and carried weapons arise as incident records from causes already in the world"
area: gov
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
after: world-police-patrol-and-grievance-causes
source: split from gov-justice-incident-records (M, really L) by the claiming session, Oct 19
claimed-at: 2026-10-20T04:53:20.573Z
lead: governing
standard: 2
model: opus
effort: high
root: rc8-law-judged-by-paperwork
checked: fable 2026-11-10
---

**What.** The justice engine hears only officials' bribery cases, so no defendant, complainant or weapon exists for five laws to act on. Add one incident record type that arises from causes already in the world: a police stop from the town's patrol hours and crime outcomes, a fight from two people's recorded grievance, and a carried weapon from a household's recorded firearm ownership. Each record names the people involved, the place, the date and the cause record that earned it, and nothing is drawn by a percentage roll. The patrol-hours record and the recorded grievance do not exist yet (world-police-patrol-and-grievance-causes, blocked).

**Cause.** Design: owner ruling Oct 24 (simulate it, don't ask; no dice; `docs/coordination/OWNER-DECISIONS.md`) and the justice chain `docs/design/one-model-two-tiers.md`. Found in code: `src/core2/modules/justice.ts` hears only officials' bribery cases today; there is no incident record type.

**Fix.** Add one incident record type from causes already in the world (a stop from patrol hours and crime outcomes, a fight from recorded grievance, a carried weapon from household firearm ownership), each naming people, place, date and the cause record, in a new `src/core2/justice-incidents.ts` with its parameters under `src/core2/data/justice/`, and hand the incident to the justice engine's existing charge step.

**Time box.** 8 hours for one opus session.

**Rules.** No dice: no roll decides a charge or ruling; traits, evidence, the law in force and relationships do. An effect is a read, not a record: the engine reads the law at the moment it decides, and a recorded flag nobody reads does not count. One rule, all 56 places: the law rows are place data, with no place named in code. One model, two tiers: counted people meet the same rule as full people times their count. Closes the incident prerequisite of the five SG-GOV-REACH-A rows only when the engine reads the law, never by deleting the row.

**Done when.** A second session plays a one-year world (`buildBenchWorld`) in a place drawn from all 56 with a seed the builder did not choose (both named) and sees stop, fight and carried-weapon incident records, each citing its cause record id and naming real people by record id, and a year without the cause produce none; `src/core2/justice-incidents.test.ts` proves it.

**Waits on.** world-police-patrol-and-grievance-causes (blocked): the patrol-hours record, the crime-outcome measure and the recorded grievance.

**Files.** src/core2/modules/justice.ts, src/core2/justice-chain.ts, src/core2/justice-incidents.ts (new), src/core2/data/justice/ (new), src/core2/justice-incidents.test.ts (new), docs/design/one-model-two-tiers.md

**Notes.** Closes the incident prerequisite of the five SG-GOV-REACH-A rows in src/core2/data/stopgaps.json only when the engine reads the law, never by deleting the row. Check docs/coordination/DECISION-REGISTER.md and OWNER-DECISIONS.md before adding any player-facing step. Remainder of gov-justice-incident-records.

Oct 20: Switched from blocked to the automatic after: gate on world-police-patrol-and-grievance-causes, so it opens by itself the moment those items are done.

Deferred Oct 25: nothing on screen reads it yet.
