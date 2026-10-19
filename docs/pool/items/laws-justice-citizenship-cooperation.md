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
blocked-on: spec: the item text is an empty TODO shell; the done-when must be written before it can be built (pool-todo-shells-need-spec)
after: gov-justice-incident-records
source: added with npm run pool -- add
---

**What.** A law on partnering with federal immigration enforcement (stopgap SG-GOV-REACH-A-citizenship) should reach a sheriff's stops and holds. Once the justice engine hears a stop (gov-justice-incident-records), the sheriff reads the law in force when deciding whether to hold a person for a federal request. The player would notice a hold, or release, by the place's rule.

**Rules.** An effect is a read, not a record: the engine reads the law at the moment it decides. No dice: the decision comes from the person's record, the evidence and the law in force. One rule, all 56 places: the law row is place data. The chain is the acceptance. Owner: police and the war design are 1.0 (register, Oct 14), so this waits behind the incident records.

**Done when.** A one-year played world in a drawn place shows a named person's hold decision citing the law row, by incident record id, and the stopgap row resolved; a test in src/core2 covers it.

**Files.** src/core2/modules/justice.ts, src/core2/law-reach/group-a.ts, src/core2/data/laws/reach-group-a.json, src/core2/data/stopgaps.json

**Notes.** Split Oct 19 (claude/peaceful-ritchie-03780x) from laws-family-justice, as its Done when asks, gated on gov-justice-incident-records because the justice engine hears only officials' bribery cases today. Citizenship and restoring voting after a sentence: the voting law is already read by the voting mechanic.
