---
id: elections-holders-stand-again-too-often
title: "Local holders stand again 92 percent of the time in played towns, against 58 to 78 percent in the research"
area: elections
kind: bug
priority: 2
size: S
status: done
claimed-by: governing/holders-stand-again
pr: #7215
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-04T08:45:14.658Z
---

**What.** In 24 places drawn from all 56 (totals script, seed a63ad2af1003c7ad, two played years), 198 of 216 local holders whose seat was up ran again (T1 0.917): councils 0.95, counties 0.91. The research (docs/research/local-incumbency-2026-10-30.md, T1) puts eligible local incumbents who seek re-election at 58 to 78 percent: councils 63 to 76, county commissions 70 to 81. A holder's choice is the stand-again rule in src/core2/modules/candidacy.ts (standsAgain: votingStandAgainBase 0.9 less an age reason, weighed by voting.stand-again), set in one Vermont town to give 82 percent. Because so few seats open, newly seated members mostly beat a holder (T6 0.77, band 18 to 30) and most local races go uncontested.

**Rules.** No dice: each holder's choice follows their own age, traits and reasons; the real share checks the total and never decides one holder. Sliding scales and causes: no cutoff. One rule, all 56 places: the totals come from places drawn from all 56, each named with its seed. Research before building: the T1 band and its sources are cited in the parameter's tag.

**Done when.** Over two played years in at least 12 places drawn from all 56 (totals script, names and seeds printed), the share of local holders whose seat is up who run again sits between 58 and 80 percent, read by contest id from each holder's candidacy decision; the stand-again parameters changed are tagged with what they were checked against; the incumbency totals T3 and T6 are reported beside it.

**Files.** src/core2/modules/candidacy.ts, src/core2/data/campaigns/parameters.json, scripts/core2-year/incumbency-totals.ts

**Notes.** Filed by Lane 1, Nov 4 (unit 5, seats open up). A measurement of votingStandAgainBase at 0.7 and 0.5 (spread 0.5 to 1.2) on seed a63ad2af1003c7ad is running.
