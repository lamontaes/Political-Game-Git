---
id: gov-justice-stand-your-ground
title: "A self-defense claim is charged or dropped by the stand-your-ground law in force"
area: gov
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
after: gov-justice-incident-producer
source: split from gov-justice-incident-records (M, really L) by the claiming session, Oct 19
claimed-at:
---

**What.** When a fight ends with one person harmed, the prosecutor's charging decision reads the stand-your-ground law in force: with it, a defender who had no duty to retreat is not charged on the retreat fact; without it, the same facts are charged. The retreat facts come from the incident record, not from the law row. The decision and the facts it rested on are recorded together.

**Rules.** No dice: no roll decides a charge or ruling; traits, evidence, the law in force and relationships do. An effect is a read, not a record: the engine reads the law at the moment it decides, and a recorded flag nobody reads does not count. One rule, all 56 places: the law rows are place data, with no place named in code. One model, two tiers: counted people meet the same rule as full people times their count.

**Done when.** In a one-year run of the played world in a drawn place and seed (named in the PR body), a fight incident with a defender is charged under one law and dropped under another with the same facts, shown by incident record id, charging decision id and the law row read; tested in src/core2/justice-incidents.test.ts.

**Files.** src/core2/modules/justice.ts, src/core2/justice-law.ts, src/core2/data/laws/reach-group-a.json

**Notes.** Closes SG-GOV-REACH-A-stand-your-ground in src/core2/data/stopgaps.json only when the engine reads the law, never by deleting the row. Check docs/coordination/DECISION-REGISTER.md and OWNER-DECISIONS.md before adding any player-facing step. Remainder of gov-justice-incident-records.
