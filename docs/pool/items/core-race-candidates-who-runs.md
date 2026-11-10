---
id: core-race-candidates-who-runs
title: "Out-of-town races: who runs is a people-engine decision and each candidate has a record and a campaign"
area: core
kind: stopgap
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
model: opus
effort: high
root: rc1-world-outside-town
lead: governing
source: added with npm run pool -- add
claimed-at:
after:
checked: fable 2026-11-10
---

**What.** An out-of-town U.S. House, Senate or legislature race stands the seat's holder for their party and a seeded challenger for the other (the stand-in path in src/core2/modules/voting.ts, stopgap SG-GOV-who-runs-stand-in), and neither has a campaign of their own. Replace that pair with a who-runs decision. The seat's pool is the state's counted adults old enough for the office; each weighs running through the existing counted-tier rule `countedCandidacyReasons` in src/core2/modules/candidacy.ts (traits, age, work hours, the people who know them, engagement) against the seat's open contest, and the sitting holder weighs running again with the full-person `candidacyReasons`. The strongest pull per party files, is filled in as a named candidate whose filing keeps its reasons by record id, and each candidate's campaign inputs (money, name recognition, ads versus doors) come from their own money, standing and traits, as the owner ruled Oct 20 for rivals. Seen: the November ballot, where each out-of-town House, Senate and legislature race stands a seeded challenger instead of someone who chose to run.

**Cause.** Found in code: src/core2/modules/voting.ts fields the seat's holder plus a "typical challenger" for out-of-town races (stopgap SG-GOV-who-runs-stand-in, `api.stopgap` at line 1893; role "state-executive-challenger" at lines 4028, 4488 and 4875). `countedCandidacyReasons` (src/core2/modules/candidacy.ts line 430) already weighs a counted resident for a contest and is unused for these races.

**Fix.** Replace the holder-plus-seeded-challenger pair with a who-runs decision: would-be candidates weigh running through `countedCandidacyReasons` and the holder through `candidacyReasons`. Outside the town there are no counted voter rows, only counts by place (src/core2/electorate-places.ts) and the country tier's state cells, so draw a small fixed number of would-be candidates per party per race by seeded generation of who exists, each with traits and a record consistent with their place's counts, and weigh only those, on the filing day only, never every adult of a state; the strongest pull per party files, is filled in as a named candidate (identity by seeded generation of who exists, consistent with the counted record) whose filing keeps its reasons, and the campaign engine reads each candidate's own money and recognition. Delete the typical-campaign constants and narrow SG-GOV-world-race-lean to the legislative-district results data.

**Time box.** 10 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: who stands follows traits, ambition, age and the seat; a rate of challengers per seat only checks totals. One model, two tiers: the seat's counted adults are weighed by the same rule as a full person, times their count, and a candidate who is filled in matches the counted record. Replace, never layer: the fixed holder-and-seeded-challenger pair and the typical-campaign constants are deleted in the same change. One rule, all 56 places: no state or district is named in code; seat facts come from data. Ask why: each filing answers why by its candidacy decision record. No hand-written player text: names and lines come from the identity generator and the English engine.

**Done when.** A second session, not the builder, plays a one-year buildBenchWorld in a drawn place and a seed it chose (both named in the PR body) and opens the November ballot: each out-of-town House, Senate and legislature race shows candidates who each filed by a who-runs decision with recorded reasons, by decision record id, and the campaign engine reads their own money and recognition when the race is counted. A case in src/core2/world-races.test.ts shows two seats in the same state with different fields only where the pool's traits and money differ. The retained row SG-GOV-world-race-lean no longer names candidate stand-ins and identifies any remaining district-results scope.

**Waits on.** Nothing. (The Oct 20 note waited on core-race-candidates-with-records-house for the candidate-with-record shape; that item is not required to start.)

**Files.** src/core2/modules/voting.ts, src/core2/race-places.ts, src/core2/modules/candidacy.ts, src/core2/world-races.test.ts, src/core2/data/stopgaps/gov.json

**Notes.** Oct 20 (pool feeder): spec written; the blocker ("a counted-tier who-runs rule must be chosen first") is answered by countedCandidacyReasons (candidacy.ts line 255), which already weighs a counted resident for a contest; the item reuses it. Waits on core-race-candidates-with-records-house (in a PR) for the candidate-with-record shape.
