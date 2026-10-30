---
id: campaign-incumbency-calibrated
title: "Local incumbents win about as often as real ones do: incumbency counted once, checked against the re-election totals"
area: elections
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
source: governing lead, Oct 30 (measure-m5 APPEAL lines; research on governing/incumbency-calibration)
---

**What.** In the measurement runs a local incumbent's appeal carries a public standing term of about 0.15 and a separate voter-trait term toward incumbents of about 0.4, and most of the voters who turn out also give the incumbent their word at the door, so a challenger almost never wins: in Necedah, Wisconsin (5555700, seed c7bb9f45ea4345d1) incumbents took about 80 percent of the vote three races running, and in Salida, Colorado about 78. Verified research (docs/research/local-incumbency-2026-10-30.md on branch governing/incumbency-calibration) gives the real totals: about 66 to 78 percent of local incumbents who run in a contested race win, 18 to 30 percent of newly seated local members beat an incumbent, and incumbency is worth about 5 to 12 points of vote share against a comparable challenger. The two incumbency terms may count the same advantage twice.

**Rules.** Real rates check totals, never one actor's outcome (no dice): measure the world's own totals over played worlds and calibrate the standing and trait terms within their spreads until they sit in the research bands, tagging each parameter with what it was checked against. Ask why: a four-version ablation (each of the standing term and the trait term zeroed in turn) shows whether the advantage is counted twice, by record. One rule, all 56 places: totals over places drawn from all 56, the place and seed named.

**Done when.** Over played years in at least eight places drawn from all 56 (names and seeds printed), the world's local races show the contested-race incumbent win rate inside 66 to 78 percent and the newcomers-who-beat-an-incumbent share inside 18 to 30 percent, read from the election results by contest id; the ablation's four totals are reported; the parameters changed are tagged with the research they were checked against.

**Files.** src/core2/electorate.ts, src/core2/modules/voting.ts, src/core2/data/campaigns/parameters.json, docs/research/local-incumbency-2026-10-30.md

**Notes.** TODO
