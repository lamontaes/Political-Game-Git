---
id: elections-local-races-share-above-band
title: "Local races are about 85 percent uncontested in played towns (94 of 111 contests, 99% interval 74 to 92), above Ballotpedia's 58 to 75 percent: try the stay-out pull at 3.8"
area: elections
kind: bug
priority: 3
size: M
status: open
claimed-by:
pr: #5806
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** Measured Oct 20 in about 30 random places (buildBenchWorld, 400 days, candidacy-calibration test seed 2bcba597e55132fcb4ffd69d65e3626a plus four earlier batches): 94 of 111 local seats had no more than one candidate, 85 percent. The calibration test passes because one run's interval still reaches 80, so it only catches a clear miss. SG-P15-candidacy-weights holds candidacyStayOutPull at 4.0 with a documented spread of 3.8 to 4.4. Run the same measurement at 3.8 and 3.9, keep the value whose pooled share over at least 100 contests puts the interval's center near 70 percent, and check src/core2/who-runs.test.ts and the incumbency rate (about 81 percent run again) still hold.

**Rules.** No dice: the weight changes the pull, never a roll. Research before building: Ballotpedia's counts are the check. One rule, all 56 places. Keep the value inside the parameter's documented spread or document why not.

**Done when.** The pooled uncontested share over at least 100 local seats in places drawn at random (seeds named in the PR body) has its center within 8 points of 70 percent; src/core2/candidacy-calibration.test.ts and who-runs.test.ts pass; the parameter's citation records the measurement.

**Files.** src/core2/data/candidacy/parameters.json,src/core2/candidacy-calibration.test.ts

**Notes.** TODO

- Cloud merger, after #5733 merged: the staying-out pull is recorded at 3.8 to 4.4, but the share of local seats with one candidate is still 85 to 92 percent against the band of 58 to 75, so this item stays open.

Oct 21 (claude, PR #5592): another pooled measurement on main with #5756 merged, `candidacy-calibration.test.ts` seed lr1: 43 of 48 local seats with no more candidates than seats, 90 percent (99 percent interval 73 to 96), places Daniels Farm CT, Penalosa KS, Mansfield SD and others named in the test output; Monarch MT decided no contest. Same direction as the 85 percent above: the pull alone does not reach the band. The test now names the place and seed when a drawn year stops (it stopped in Monarch MT on a housing defect, fixed in PR #5772). Not a duplicate item: elections-local-races-too-uncontested keeps the cause search; this one keeps the pull's value.

Sent back 2026-10-23 from PR #5774 (branch claude/uncontested-note): Missing release declaration (impact none is appropriate for notes) and bounded measurement-note Done-when table; finish on that branch, merge main into it first.

Sent back 2026-10-23 from PR #5806 (branch claude/share-above-band): Required prerequisite #5804 is still open and its calibration test absent; update the stale acceptance test path in place and rerun after integrating that prerequisite; finish on that branch, merge main into it first.

Merger 2: Left PR #5774 pending on 2026-10-24 UTC (branch claude/uncontested-note, integrated head d1dd2f5bba69457d3c4131a5fd6f9009dac57de6): the cloud environment became unavailable during the local gate, so its final result is unknown. No merge or done flip was attempted. Merge current main and rerun the local gate when an environment is available; the calibration item remains open.
