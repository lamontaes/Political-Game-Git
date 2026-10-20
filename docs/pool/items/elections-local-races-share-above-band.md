---
id: elections-local-races-share-above-band
title: "Local races are about 85 percent uncontested in played towns (94 of 111 contests, 99% interval 74 to 92), above Ballotpedia's 58 to 75 percent: try the stay-out pull at 3.8"
area: elections
kind: bug
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Measured Oct 20 in about 30 random places (buildBenchWorld, 400 days, candidacy-calibration test seed 2bcba597e55132fcb4ffd69d65e3626a plus four earlier batches): 94 of 111 local seats had no more than one candidate, 85 percent. The calibration test passes because one run's interval still reaches 80, so it only catches a clear miss. SG-P15-candidacy-weights holds candidacyStayOutPull at 4.0 with a documented spread of 3.8 to 4.4. Run the same measurement at 3.8 and 3.9, keep the value whose pooled share over at least 100 contests puts the interval's centre near 70 percent, and check src/core2/who-runs.test.ts and the incumbency rate (about 81 percent run again) still hold.

**Rules.** No dice: the weight changes the pull, never a roll. Research before building: Ballotpedia's counts are the check. One rule, all 56 places. Keep the value inside the parameter's documented spread or document why not.

**Done when.** The pooled uncontested share over at least 100 local seats in places drawn at random (seeds named in the PR body) has its centre within 8 points of 70 percent; src/core2/candidacy-calibration.test.ts and who-runs.test.ts pass; the parameter's citation records the measurement.

**Files.** src/core2/data/candidacy/parameters.json,src/core2/candidacy-calibration.test.ts

**Notes.** TODO
