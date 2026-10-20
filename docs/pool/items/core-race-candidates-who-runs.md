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
after: core-race-candidates-with-records-house
---

**What.** Today an out-of-town U.S. House, Senate or legislature race (built in world-races.ts by specialCandidates and the typical-candidate path) stands the seat's holder for their party and a seeded challenger from drawOfficialIdentity for the other, and neither has a campaign of their own. Replace that pair with a who-runs decision. The seat's pool is the state's counted adults old enough for the office; each weighs running through the existing counted-tier rule `countedCandidacyReasons` in candidacy.ts (traits, age, work hours, the people who know them, engagement) against the seat's open contest, and the sitting holder weighs running again with the full-person `candidacyReasons`. The strongest pulls per party file, each filled in as a named candidate (identity by seeded generation of who exists, consistent with the counted record) whose filing keeps its reasons by record id. Each candidate's campaign inputs (money, name recognition, ads versus doors) come from their own money, standing and traits, as the owner ruled Oct 20 for rivals: a rich candidate leans on paid ads and staff, a poor one on doors and volunteers, a known incumbent on press and record, an unknown on building name recognition.

**Rules.** No dice: who stands follows traits, ambition, age and the seat; a rate of challengers per seat only checks totals. One model, two tiers: the seat's counted adults are weighed by the same rule as a full person, times their count, and a candidate who is filled in matches the counted record. Replace, never layer: the fixed holder-and-seeded-challenger pair and the typical-campaign constants are deleted in the same change, and the open part of SG-GOV-world-race-lean is narrowed to the legislative-district results data. One rule, all 56 places: no state or district is named in code; seat facts come from data. Ask why: each filing answers why by its candidacy decision record. No hand-written player text: names and lines come from the identity generator and the English engine.

**Done when.** In a one-year run of the played world (buildBenchWorld, a place drawn from all 56 with a seed the builder did not choose, both named in the PR body) each out-of-town House, Senate and legislature race on the November ballot shows candidates who each filed by a who-runs decision with recorded reasons, by decision record id, and the campaign engine reads their own money and recognition when the race is counted. A case in src/core2/world-races.test.ts shows two seats in the same state with different fields only where the pool's traits and money differ.

**Files.** src/core2/modules/world-races.ts, src/core2/modules/candidacy.ts, src/core2/world-races.test.ts, src/core2/data/stopgaps.json

**Notes.**

Oct 20 (pool feeder): spec written; the blocker ("a counted-tier who-runs rule must be chosen first") is answered by countedCandidacyReasons (candidacy.ts line 255), which already weighs a counted resident for a contest; the item reuses it. Waits on core-race-candidates-with-records-house (in a PR) for the candidate-with-record shape.
