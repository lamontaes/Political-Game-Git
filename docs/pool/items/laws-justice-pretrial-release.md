---
id: laws-justice-pretrial-release
title: "Ending cash bail changes who waits in jail before trial (SG-GOV-REACH-A-pretrial)"
area: laws
kind: wiring
priority: 3
size: S
status: blocked
claimed-by:
pr:
blocked-on:
after: gov-justice-incident-producer, justice-bail-moves-the-cash
source: added with npm run pool -- add
---

**What.** Extend the pretrial wait from charged officials to everyone the justice engine charges. decidePretrial in src/core2/justice-pretrial.ts already reads the end-cash-bail law (lawInForce) and the defendant's cash against the bail estimate, holds a poor defendant in custody and releases them when bail is ended; it is called only for bribery cases. Once the incident producer and the charging step create cases for ordinary defendants (stops, fights, weapons), route those cases through the same decidePretrial so a poor person arrested for a fight waits in custody where cash bail is law and goes home where it is ended, and make the flat estimated bail follow the charge's grade from the sentencing data in place of one number.

**Rules.** No dice: held or released follows the law in force, the defendant's liquid cash and the charge, never a roll. An effect is a read, not a record: the pretrial row is read by the custody step that keeps the person out of play and by the jail count the budget reads. One rule, all 56 places: the bail law and the bail figures are data by place. One model, two tiers: counted defendants wait by the same rule times their count. Estimate, never UNKNOWN: a bail figure starts from the real average with a spread and its source in the parameter table.

**Done when.** In a one-year run of the played world (buildBenchWorld, every module installed) in a place drawn from all 56 with a seed the builder did not choose, a poor ordinary defendant from a fight incident is held with cash bail law and freed when it is ended, shown by the incident id, case id, pretrial row id and statute id; src/core2/justice-pretrial.test.ts proves it and SG-GOV-REACH-A-pretrial is resolved in src/core2/data/stopgaps.json.

**Files.** src/core2/justice-pretrial.ts, src/core2/modules/justice.ts, src/core2/data/justice/parameters.json, src/core2/data/stopgaps.json, src/core2/justice-pretrial.test.ts

**Notes.** Oct 20 (pool feeder): spec written; PR #5200 already holds charged officials (SG-GOV-REACH-A-pretrial narrowed), so the remaining work is ordinary defendants, which need the incident producer; the open bail-cash bug justice-bail-moves-the-cash should land first or in the same area.
