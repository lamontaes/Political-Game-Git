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
blocked-on: spec: the item text is an empty TODO shell; the done-when must be written before it can be built (pool-todo-shells-need-spec)
after: gov-justice-incident-records
source: added with npm run pool -- add
---

**What.** Ending cash bail (stopgap SG-GOV-REACH-A-pretrial) should change who waits in jail before trial. Once the justice engine hears an arrest or a charge (gov-justice-incident-records), the court reads the law in force when it sets release for an accused person: where cash bail is ended, release does not depend on what the person can pay, and where it stands, a person who cannot pay waits in custody. The player would notice a neighbor home or in jail by the place's rule.

**Rules.** An effect is a read, not a record: the engine reads the law at the moment it decides. No dice: the decision comes from the person's record, the evidence and the law in force. One rule, all 56 places: the law row is place data. The chain is the acceptance. Owner: police and the war design are 1.0 (register, Oct 14), so this waits behind the incident records.

**Done when.** A one-year played world (buildBenchWorld) in a drawn place shows a named accused person's release decision citing the law row, with the custody record id, and the stopgap row resolved; a test in src/core2/justice-incidents.test.ts or a new file covers it.

**Files.** src/core2/modules/justice.ts, src/core2/law-reach/group-a.ts, src/core2/data/laws/reach-group-a.json, src/core2/data/stopgaps.json

**Notes.** Split Oct 19 (claude/peaceful-ritchie-03780x) from laws-family-justice, as its Done when asks, gated on gov-justice-incident-records because the justice engine hears only officials' bribery cases today. Citizenship and restoring voting after a sentence: the voting law is already read by the voting mechanic.
