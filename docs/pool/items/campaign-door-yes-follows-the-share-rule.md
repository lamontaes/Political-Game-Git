---
id: campaign-door-yes-follows-the-share-rule
title: "A counted household's door yes follows the same share rule its ballot does, not the record's first choice"
area: elections
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** On the ballot a counted record's people divide by each candidate's share of their appeal (countedDivision, CTO Nov 1), but at the door the reached household answers yes only where the candidate is the record's first choice (doorChoiceOf in src/core2/modules/voting.ts, countedChoice). Against a known holder almost no record ranks a challenger first, so a challenger who wins about a third of the vote gets almost no door yeses: Hardyville, Kentucky (replay storrs-1, main 80dd12c83a) lost a two-way county race 35.4 to 64.6 percent with 14 door yeses from 1,848 people reached over 41 weeks, while Ely, Nevada's open-seat winner had 738 from 2,986. The door and the ballot read one choice by two rules, and the yes is what lifts turnout and votes (unit 4), so a hard-working challenger can't build support against a holder.

**Rules.** One model, two tiers: a counted record's reached households answer by the same division its people vote by. No dice: which of a record's households says yes is given out in order with the remainder carried (the first household of a record with a 0.35 share for the player answers no, the third yes, and so on), never drawn. The CTO's Nov 1 division stands for the households not reached and for a household's word once given. Question for the CTO before building: is apportioning a record's door answers by its share the reading of the Nov 1 ruling, or does the ruling mean the record's first choice for every household reached?

**Done when.** In Hardyville, Kentucky (replay storrs-1) and two places drawn from all 56 (named with seeds), a challenger's door yeses as a share of the households reached sit within 10 points of their share of that record set's appeal, by pledge record ids; the ballot still reads each yes as near-binding; the path check reports door yes and the vote share for the fixed towns.

**Files.** src/core2/modules/voting.ts, src/core2/modules/campaigns.ts

**Notes.** Filed by Lane 1, Nov 4, from the fixed-town margins (lane-1/path-margins). Waiting on the CTO's reading of the Nov 1 division ruling; Lane 1 builds it on the answer.
