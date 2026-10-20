---
id: core-race-candidates-who-runs
title: "Out-of-town races: who runs is a people-engine decision and each candidate has a record and a campaign"
area: core
kind: stopgap
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 
---

**What.** Out-of-town U.S. House, Senate and legislature races now name their two candidates (PR for core-race-candidates-with-records-house), but who stands is fixed to the seat's holder and a seeded challenger, and neither has a record or a campaign of their own. Make who runs the people engines' who-runs decision for those seats (traits, ambition, the seat), and give each candidate a record and the campaign the town's own races use.

**Rules.** One model, two tiers: a candidate is a counted name until met. No dice: who runs follows traits and ambition. Replace, never layer: the fixed holder-and-challenger pair is deleted.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place, seed named) each out-of-town race shows candidates who each filed by a who-runs decision with recorded reasons, by record id, and the stopgap row SG-GOV-world-race-lean no longer names candidates; a case in src/core2/world-races.test.ts covers it.

**Files.** src/core2/modules/world-races.ts, src/core2/modules/candidacy.ts

**Notes.** TODO
