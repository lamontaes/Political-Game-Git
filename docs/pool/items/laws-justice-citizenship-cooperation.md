---
id: laws-justice-citizenship-cooperation
title: "A law on partnering with federal immigration enforcement reaches a sheriff's stops and holds (SG-GOV-REACH-A-citizenship)"
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

**What.** Make the law on partnering with federal immigration enforcement change what a sheriff does with a stopped person. When a stop incident from the incident producer ends with a noncitizen (`isNoncitizen`, the same read for full people and counted members) and the partnership law is in force through `lawInForce`, the stop becomes a hold for immigration agents and the person is put in custody with `holdInCustody`; with the law not in force the same stop ends as it would for a citizen. The reach of the law already names noncitizen adults; this item adds the decision at the stop, so the reach row becomes a read by the justice engine and not a record. The counted groups' detainer holds already run in the public-safety engine (`detainers`); this is the named person's stop. The stop-to-hold mapping may not fit the 287(g)-only question (see law-levels-sanctuary-flags-from-state-code).

**Cause.** Design: owner ruling Oct 24, "Simulate it, don't ask" (AGENTS.md), and the stopgap row SG-GOV-REACH-A-citizenship (src/core2/data/stopgaps/gov.json, already resolved for the reach). Found in code: `isNoncitizen` (src/core2/citizenship.ts, line 15) and `holdInCustody` (src/core2/justice-custody.ts, line 9) exist, `detainers` (src/core2/public-safety.ts, line 1465) holds counted noncitizens, and no named person's stop reaches the justice engine because the incident producer (gov-justice-incident-producer) is not built.

**Fix.** When a named person's stop incident ends with a noncitizen and the partnership law is in force, hold them for immigration agents with `holdInCustody`; otherwise end the stop as for a citizen. The hold cites the stop record id and the law row id.

**Time box.** 4 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record: the justice engine reads `lawInForce` at the moment it decides the stop, so the law row changes a person's custody. No dice: whether a person is held follows their citizenship record, the law in force and the stop, never a percentage. One rule, all 56 places: the law key is place data read through the law chain and no state is named in code. One model, two tiers: counted noncitizens in a group are held by the same rule times their count. Ask why: the hold cites the stop record id and the law row id. No hand-written player text.

**Done when.** A second session, not the builder, runs a one-year played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (both named). Two stops of noncitizens in places with and without the law end differently, shown by the stop incident id, the citizenship read, the law row id and the custody record id; src/core2/justice-incidents.test.ts (new) proves it.

**Waits on.** gov-justice-incident-producer (the stop incident record).

**Files.** src/core2/modules/justice.ts, src/core2/justice-custody.ts, src/core2/citizenship.ts, src/core2/law-reach/group-a-records.ts, src/core2/public-safety.ts, src/core2/justice-incidents.test.ts (new)

**Notes.** Oct 20 (pool feeder): spec written; the stopgap row SG-GOV-REACH-A-citizenship is already resolved (people have a citizenship record, citizenship.ts), so only the stop-and-hold decision remains and it waits for gov-justice-incident-producer, not the in-PR parent gov-justice-incident-records. Police as a deciding body is 1.0 (owner, Oct 14): this builds the justice engine's read of a stop record only, no patrol or officer behavior.
