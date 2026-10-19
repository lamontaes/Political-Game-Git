---
id: laws-justice-firearm-storage
title: "A child access prevention law reaches a gun owner whose child reaches the gun (SG-GOV-REACH-A-firearms)"
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

**What.** A child access prevention law (stopgap SG-GOV-REACH-A-firearms) should reach a gun owner whose child gets at the gun. Once the justice engine hears an incident (gov-justice-incident-records), the prosecutor reads the law in force when deciding whether to charge the owner. The player would notice a charge, or none, by the place's rule.

**Rules.** An effect is a read, not a record: the engine reads the law at the moment it decides. No dice: the decision comes from the person's record, the evidence and the law in force. One rule, all 56 places: the law row is place data. The chain is the acceptance. Owner: police and the war design are 1.0 (register, Oct 14), so this waits behind the incident records.

**Done when.** A one-year played world in a drawn place shows a named owner's charging decision citing the law row, by incident record id, and the stopgap row resolved; a test in src/core2 covers it.

**Files.** src/core2/modules/justice.ts, src/core2/law-reach/group-a.ts, src/core2/data/laws/reach-group-a.json, src/core2/data/stopgaps.json

**Notes.** Split Oct 19 (claude/peaceful-ritchie-03780x) from laws-family-justice, as its Done when asks, gated on gov-justice-incident-records because the justice engine hears only officials' bribery cases today. Citizenship and restoring voting after a sentence: the voting law is already read by the voting mechanic.
