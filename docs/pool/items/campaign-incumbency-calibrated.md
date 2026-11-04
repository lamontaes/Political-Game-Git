---
id: campaign-incumbency-calibrated
title: "Local incumbents win about as often as real ones do: incumbency counted once, checked against the re-election totals"
area: elections
kind: bug
priority: 1
size: M
status: claimed
claimed-by: governing/incumbency-calibration
pr:
blocked-on:
source: governing lead, Oct 30 (measure-m5 APPEAL lines; research on governing/incumbency-calibration)
lead: governing
claimed-at: 2026-11-03T23:37:35.628Z
---

**What.** In the measurement runs a local incumbent's appeal carries a public standing term of about 0.15 and a separate voter-trait term toward incumbents of about 0.4, and most of the voters who turn out also give the incumbent their word at the door, so a challenger almost never wins: in Necedah, Wisconsin (5555700, seed c7bb9f45ea4345d1) incumbents took about 80 percent of the vote three races running, and in Salida, Colorado about 78. Verified research (docs/research/local-incumbency-2026-10-30.md on branch governing/incumbency-calibration) gives the real totals: about 66 to 78 percent of local incumbents who run in a contested race win, 18 to 30 percent of newly seated local members beat an incumbent, and incumbency is worth about 5 to 12 points of vote share against a comparable challenger. The two incumbency terms may count the same advantage twice.

**Rules.** Real rates check totals, never one actor's outcome (no dice): measure the world's own totals over played worlds and calibrate the standing and trait terms within their spreads until they sit in the research bands, tagging each parameter with what it was checked against. Ask why: a four-version ablation (each of the standing term and the trait term zeroed in turn) shows whether the advantage is counted twice, by record. One rule, all 56 places: totals over places drawn from all 56, the place and seed named.

**Done when.** Over played years in at least eight places drawn from all 56 (names and seeds printed), the world's local races show the contested-race incumbent win rate inside 66 to 78 percent and the newcomers-who-beat-an-incumbent share inside 18 to 30 percent, read from the election results by contest id; the ablation's four totals are reported; the parameters changed are tagged with the research they were checked against.

**Files.** src/core2/electorate.ts, src/core2/modules/voting.ts, src/core2/data/campaigns/parameters.json, docs/research/local-incumbency-2026-10-30.md

**Notes.** Nov 2, 01:40 (governing lead): branch governing/incumbency-calibration at f520af79ba (the trait term centered on the town's incumbent lean). Next, after the counted-split PR: fit the incumbency weight against T1 to T6 with scripts/core2-year/incumbency-totals.ts, one totals run at a time (governing-measurement).

Nov 4, 02:45 (Lane 1, branch governing/incumbency-calibration at d6db3df9ff, main merged, the trait term centered): the same code gives very different totals on two drawn samples. Seed f556fe5e8b2fe6fd, 12 places: holders won 12 of 12 contested races (T3 1.0) and newcomers beat a holder in 0 of 5. Seed a63ad2af1003c7ad, 24 places: holders won 13 of 23 (T3 0.565) and newcomers beat one in 10 of 13 (T6 0.769). Pooled, 25 of 35 (0.71, inside 66% to 78%) and 10 of 18 (0.56, above 18% to 30%). The f556 ablation (standing only 0.83, trait only 0.67, neither 0.54) read as a double count, but with 12 contested races a sample moves T3 by tens of points. Versions on a63 (standing halved, trait halved, neither) are running; no value is set until a pooled sample of 30 or more contested races per version is in.
