---
id: elections-counted-vote-splits-by-share
title: "A counted voter record splits its unpledged votes by a share of the appeal gap, so a small edge moves a few points, not every group"
area: elections
kind: bug
priority: 1
size: M
status: in-pr
claimed-by: governing/counted-vote-share
pr: #7142
blocked-on:
lead: governing
source: governing lead, Nov 1 (incumbency ablation; CTO ruling)
claimed-at: 2026-11-03T21:40:11.814Z
---

**What.** A counted voter record stands for many residents but votes as one: its unpledged weight goes to whoever is strictly first (countedChoice in src/core2/electorate.ts, used in src/core2/modules/voting.ts and the place tally). In nonpartisan local races voters' margins bunch within about 0.17 appeal units, so a small edge flips whole groups: 0.15 units of bare incumbency moved Lajas, Puerto Rico by 19.6 points, and either incumbency term alone holds 94 percent of contested races. The CTO ruled on Nov 1 that the unpledged weight divides by a logistic share of the appeal gaps at appealPerShare's slope, pledged households keeping their whole vote and named voters keeping first place.

**Rules.** One model, two tiers: a counted record's weight splits by the selection weights times the count, as counted job choices do (OWNER-DECISIONS, counted job choices). No dice: the split is a share of the count, never a roll. The near-binding door yes (Oct 29) holds: pledged households keep their whole vote. Owner ruling 4861: a small appeal gap moves the result a few points. One rule, all 56 places: the spread across places drawn from all 56 is shown, not one place. Speed: a year stays within 20 percent of its base.

**Done when.** In the totals script over at least 12 places drawn from all 56 (names and seeds printed), the holder's median share in two-way races moves by no more than about 12 points between the both and neither versions, and the share distribution across places is printed (quartiles); a test shows a counted record with a 0.1-unit appeal lead gives the leader a share near appealPerShare's slope times the gap plus half, not the whole weight, while its pledged households vote whole; named voters still pick first place; speed:year is within 20 percent of its base.

**Files.** src/core2/electorate.ts, src/core2/modules/voting.ts, src/core2/electorate.test.ts, scripts/core2-year/incumbency-totals.ts

**Notes.** CTO ruling Nov 1, ~18:00 UTC (recorded in OWNER-DECISIONS). Measured on governing/incumbency-calibration (the four-way ablation, 8 places). Built before the incumbency parameter fit.

Nov 2, 01:40 (governing lead): branch governing/counted-vote-share at e616b5dbb3 (the split, the primaries rule, src/core2/counted-vote-share.test.ts). Runner A's paired totals (governing/measure-m7a 1fd789c892, seed 911ff0d875eff939, 12 places, 2 years): the holder's two-way median share is 0.744 with both terms (n 4) and 0.476 with neither (n 5); paired moves -0.460, -0.339, -0.226 and -0.148 (median -0.28); T3 1.0 against 0.333. Santa Cruz, California crashed in run A in work-cash.ts:930 (to red main). Next: open the PR with these numbers, the 51-state check, Arvada and Lexington, and speed (+3.2%), carrying the move past 12 points to campaign-incumbency-calibrated (CTO, Nov 1).
