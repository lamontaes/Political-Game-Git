---
id: laws-justice-citizenship-cooperation
title: "A law on partnering with federal immigration enforcement reaches a sheriff's stops and holds (SG-GOV-REACH-A-citizenship)"
area: laws
kind: wiring
priority: 3
size: S
status: blocked
claimed-by:
pr:
blocked-on:
after: gov-justice-incident-producer
source: added with npm run pool -- add
---

**What.** Make the law on partnering with federal immigration enforcement (us-policy-positions:justice-public-safety.partner-with-federal-immigration-enforcement) change what a sheriff does with a stopped person. When a stop incident from the incident producer ends with a noncitizen (isNoncitizen in src/core2/citizenship.ts, the same read for full people and counted members) and the partnership law is in force through lawInForce, the stop becomes a hold for immigration agents and the person is put in custody with holdInCustody; with the law not in force the same stop ends as it would for a citizen. The reach of the law already names noncitizen adults (law-reach/group-a-records.ts); this item adds the decision at the stop, so the reach row becomes a read by the justice engine and not a record.

**Rules.** An effect is a read, not a record: the justice engine reads lawInForce at the moment it decides the stop, so the law row changes a person's custody. No dice: whether a person is held follows their citizenship record, the law in force and the stop, never a percentage. One rule, all 56 places: the law key is place data read through the law chain and no state is named in code. One model, two tiers: counted noncitizens in a group are held by the same rule times their count. Ask why: the hold cites the stop record id and the law row id. No hand-written player text: any scene or journal line about the hold comes from the English engine.

**Done when.** In a one-year run of the played world (buildBenchWorld, every module installed) in a place drawn from all 56 with a seed the builder did not choose, two stops of noncitizens in places with and without the law end differently, shown by the stop incident id, the citizenship read, the law row id and the custody record id; src/core2/justice-incidents.test.ts proves it and the row for SG-GOV-REACH-A-citizenship keeps its resolved status with the hold named in its resolution.

**Files.** src/core2/modules/justice.ts, src/core2/justice-custody.ts, src/core2/citizenship.ts, src/core2/law-reach/group-a-records.ts, src/core2/justice-incidents.test.ts

**Notes.** Oct 20 (pool feeder): spec written; the stopgap row SG-GOV-REACH-A-citizenship is already resolved (people have a citizenship record, citizenship.ts), so only the stop-and-hold decision remains and it waits for gov-justice-incident-producer, not the in-PR parent gov-justice-incident-records. Police as a deciding body is 1.0 (owner, Oct 14): this builds the justice engine's read of a stop record only, no patrol or officer behavior.
