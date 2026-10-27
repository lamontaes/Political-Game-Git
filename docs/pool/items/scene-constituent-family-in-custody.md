---
id: scene-constituent-family-in-custody
title: "Scene: a parent comes to the office about a son in custody"
area: words
kind: feature
priority: 2
size: M
status: done
claimed-by:
pr: #6304
blocked-on:
lead: director
source: added with npm run pool -- add
---

**What.** Scenes-from-life episode 3 (docs/design/scenes/from-life/constituent-family-in-custody.md, from an April 2026 senator's call to a federal prison for a constituent's incarcerated son). Trigger is the justice engine's justice.imprisoned or justice.bail-set record; place is the official's office or phone; the visitor is a living relative of the prisoner in the district; the reply writes a family-in-custody case. The producer waits on gov-constituent-case-family-in-custody for the case record.

**Rules.** No dice. scene-standard. No real name or quoted line in any player-facing file. Weights are TUNABLE rows in director.json with a spread; no number in director code.

**Done when.** In a played year in a drawn place and seed the builder did not choose, a custody record for a person with a living relative in the district fires the scene for the official, naming the custody record id and the case id; the reply writes the case referral; the lines vary by custody stage and by the visitor's tie; a test fails when the custody record is absent.

**Files.** src/director/data/situation-types.json, src/director/data/purpose-arcs.json, data/english/parts/scene-talk.json

**Notes.** Filed by Helper E. lead: director. Lines drafted in the packet for the words lead. Time box 4 h.
