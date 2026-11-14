---
id: campaign-door-warmth-follows-the-canvasser-not-the-platform
title: "A first door visit warms or cools a voter by the canvasser's manner, not by what the candidate stands for"
area: elections
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after: people-views-stances-from-life
blocked-on:
root: design-electorate-one-model
lead: views
model: opus
effort: medium
source: Words lead, Nov 14 (Meadowlands MN, 37 of 37 voters reached at doors came away warmer); measured by the views thread
---

**What.** A player who knocks doors without stating stances (the filing counter hands in none, so the campaign runs on `candidatePlatform`) leaves almost every voter warmer if they are outgoing, whatever the voter thinks of the candidate's views. A reserved voter who disagrees is about the only one who cools. Seen: the porch scene's answers and each doors outing's result on the Campaign tab, and every later read of warmth (door answers, donors, endorsements, the vote).

**Cause.** Measured: twelve hours of one canvasser's doors, every contact a first visit, at three pinned places (scratch script over `knockDoors`, `fillCounted: true`).

| Place, world seed                        | Platform                 | Canvasser sociability | Reached | Warmer | Cooler | Agreement, 10th to 90th percentile |
| ---------------------------------------- | ------------------------ | --------------------- | ------- | ------ | ------ | ---------------------------------- |
| Marshfield MA 2538820, 75d9b7ad36560f47… | from views (none stated) | 1                     | 108     | 88     | 20     | -0.069 to +0.089                   |
| Otisville NY 3655673, 580915c55b122496…  | from views (none stated) | 2                     | 81      | 80     | 1      | -0.030 to +0.051                   |
| Hargill TX 4832300, 2312894fa45ef29b…    | from views (none stated) | 1                     | 69      | 50     | 19     | -0.054 to +0.009                   |
| Marshfield MA                            | one stated stance at 1   | 1                     | 108     | 58     | 50     | -0.796 to +0.658                   |
| Otisville NY                             | one stated stance at 1   | 2                     | 81      | 59     | 22     | -0.547 to +0.768                   |
| Hargill TX                               | one stated stance at 1   | 1                     | 69      | 62     | 7      | -0.163 to +0.982                   |

Found in code: a first visit's warmth is `clamp(agreement + rapport)` times `doorContactWeight` (`reach` and `countedDoorWarmth` in `src/core2/modules/campaigns.ts`). `rapport` is `rapportWeight` (0.15) times the mean of the two people's sociability, which runs -2 to 2, so it spans -0.3 to +0.3. `agreementWith` (`src/core2/modules/views.ts`) is the mean of the voter's view times each platform position. A platform built from the candidate's views (`candidatePlatform` in `src/core2/campaign-stances.ts`, also `platformFromViews` and `platformForContest` in `src/core2/modules/candidacy.ts`) carries the candidate's stance values as positions, a tenth or two, so agreement stays within about ±0.1 (Otisville's from-views platform: rent stabilization -0.115, welfare and Medicaid -0.109, inclusionary housing -0.097). The visit's manner then outweighs the platform by about three to one; an outgoing canvasser (sociability 2) gives every voter a rapport of 0 or more, and only the few who are both reserved and disagree cool. With a stated stance at full strength the same doors cool 7 to 50 of them. The balance test (`src/core2/campaign-door-balance.test.ts`) only bounds the cooler side, so all-warmer passes.

**Fix.** A platform says which side the candidate takes; a voter weighs that side by their own view, however mildly the candidate holds it. In `agreementWith` (and `groupAgreement` in `src/core2/campaign-views.ts`, the same rule for a counted group), divide by the sum of the positions' sizes instead of their count, so agreement is the voter's view on the candidate's side, weighted by how much the candidate cares about each question, and runs -1 to 1 whatever the positions' scale. Every reader of agreement (door warmth, ads, donors, endorsements, the vote) then reads the platform at the strength the voter feels it. Re-run the campaign calibration tests that read agreement (`campaign-door-balance`, `campaign-money-calibration`, `door-pledge`, `campaign-calibration`) and refit any parameter that moves outside its band, recording the refit in its row. The balance test (`src/core2/campaign-door-balance.test.ts`) must cap both sides: warmer no more than cooler plus the same two-standard-error spread, as well as the reverse, so an all-warmer walk fails.

**Time box.** 4 hours, Opus at medium effort.

**Rules.** No dice: the voter's own view and the canvasser's manner decide. One model, two tiers: one rule for full people and counted groups. Research calibrates totals only (Kalla and Broockman 2018: persuasion near zero on average).

**Done when.** At the three pinned places above, a player filing at the counter with no stated stances and an outgoing canvasser leaves some voters cooler, and the share warmer and cooler sits inside the band the balance test checks on both sides; the balance test, run on the train before the fix, fails on the all-warmer walk. A second session, on main in a drawn place it names with its seed, files at the counter, knocks doors for an evening and sees in dev mode's Trace a voter who disagrees with the candidate's side come away cooler, named by cause record id.

**Waits on.** `people-views-stances-from-life` cut 2 (candidates' own stances), which changes the positions this reads.

**Files.** src/core2/modules/views.ts, src/core2/campaign-views.ts, src/core2/campaign-door-balance.test.ts, src/core2/data/campaigns/parameters.json

**Notes.** Nov 14 (claude, thread "Build voters' views from their lives"): the Meadowlands MN seed was not passed on; the 37 of 37 matches the Otisville row (no stated stances, an outgoing player). Own fix, not one of the views cuts: those change where a view comes from, this changes how a platform is read, and it moves every campaign total, so it needs its own calibration run.
