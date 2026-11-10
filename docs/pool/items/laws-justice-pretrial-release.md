---
id: laws-justice-pretrial-release
title: "Ending cash bail changes who waits in jail before trial (SG-GOV-REACH-A-pretrial)"
area: laws
kind: wiring
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after: gov-justice-incident-producer, justice-bail-moves-the-cash
lead: laws
model: opus
effort: medium
root: rc8-law-judged-by-paperwork
source: added with npm run pool -- add
claimed-at:
---

**What.** Extend the pretrial wait from charged officials to every named person the justice engine charges. The pretrial decision reads the end-cash-bail law and the defendant's cash against the bail estimate, holds a poor defendant in custody and releases them when bail is ended, but it is called only for bribery cases; counted defendants already wait by the same law in the public-safety engine. Once the incident producer and the charging step create cases for ordinary named defendants (stops, fights, weapons), route those cases through the same decision so a poor person arrested for a fight waits in custody where cash bail is law and goes home where it is ended, and make the flat estimated bail follow the charge's grade from the sentencing data in place of one number. This item also takes the umbrella laws-family-justice, whose other parts have their own items.

**Cause.** Found in code: `decidePretrial` (src/core2/justice-pretrial.ts, line 35) is called only for bribery cases in src/core2/modules/justice.ts (line 827). The counted tier waits by the same law in src/core2/public-safety.ts (`unableToPost`, line 976, `postBail`, line 988), and the stopgap SG-GOV-REACH-A-pretrial in src/core2/data/stopgaps/gov.json is resolved for it; the named ordinary defendant has no case until the incident producer exists.

**Fix.** Route ordinary named defendants' cases through `decidePretrial` with bail following the charge's grade (a registered parameter with its source and spread), so held or released follows the law in force, the defendant's liquid cash and the charge. The pretrial row is read by the custody step that keeps the person out of play and by the jail count the budget reads.

**Time box.** 4 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: held or released follows the law in force, the defendant's liquid cash and the charge, never a roll. An effect is a read, not a record: the pretrial row is read by the custody step and by the jail count the budget reads. One rule, all 56 places: the bail law and the bail figures are data by place. One model, two tiers: counted defendants wait by the same rule times their count. Estimate, never UNKNOWN: a bail figure starts from the real average with a spread and its source in the parameter table.

**Done when.** A second session, not the builder, runs a one-year played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (both named). A poor ordinary defendant from a fight incident is held where cash bail is law and freed when it is ended, shown by the incident id, case id, pretrial row id and statute id; src/core2/justice-pretrial.test.ts proves it.

**Waits on.** gov-justice-incident-producer (the incident records); justice-bail-moves-the-cash is done.

**Files.** src/core2/justice-pretrial.ts, src/core2/modules/justice.ts, src/core2/public-safety.ts, src/core2/data/justice/parameters.json, src/core2/justice-pretrial.test.ts

**Notes.** Oct 20 (pool feeder): spec written; PR #5200 already holds charged officials (SG-GOV-REACH-A-pretrial narrowed), so the remaining work is ordinary defendants, which need the incident producer; the open bail-cash bug justice-bail-moves-the-cash should land first or in the same area.
