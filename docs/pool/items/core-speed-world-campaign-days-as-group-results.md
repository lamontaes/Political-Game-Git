---
id: core-speed-world-campaign-days-as-group-results
title: "A world candidate's doors, polls and asks reach unwatched full people as group results (design stage 3), the next 15 to 20 s of an election year"
area: core
kind: feature
priority: 1
size: L
status: open
claimed-by:
pr:
blocked-on:
after: core-speed-message-viewers-as-groups
source: added with npm run pool -- add
claimed-at:
---

**What.** After speeches and paid messages became group results (core-speed-hearers-as-groups, core-speed-message-viewers-as-groups), Gunnison UT's election year (key 4932660, seed n8f6) still spends 35 s in world campaigns, spread thin: campaign day choices 8.9 s (doors, donation asks, events), volunteer door shifts 6.5 s (walkWith 7.2 s: doorChoiceOf 3.2, walkDoors 2.3), polls 5.1 s, group endorsements 4.0 s. Each is a per-person decision by people nobody watches (a door answer, a poll answer, a donation answer). Make a world campaign's doors, polls and asks to unwatched full people a result by hearer group: a group impression row per group and candidate (mean warmth, share who heard of them, share who know the platform), impressionOf reads the group for a member with no row of their own, and voting reads it by the same rule as a counted voter. Design: docs/speed/off-screen-campaigns-as-results.md, stage 3.

**Rules.** Level of detail (owner, Nov 9): the player's circle and focus and officials stay individual (hearsAsPerson); the player's own campaign is untouched. One model, two tiers: a group is read by the rule a person is, times its count. No dice. Behavior changes on purpose, so the proof is outcomes.

**Done when.** Gunnison, Utah (key 4932660, seed n8f6) and two other drawn places, four years, the branch against its base in alternating pairs of both orders, year 4 faster in both; town race winners, shares, turnout and stance spreads compared; a test that a group impression times its members equals the sum of the members' warmth reads within rounding.

**Files.** src/core2/modules/campaigns.ts, src/core2/modules/voting.ts, src/core2/hearer-groups.ts

**Notes.** TODO Nov 9, 22:50 UTC (Speed): built the doors part on `speed/campaign-day-groups` (9ce10f23). At a world campaign's doors, an unwatched full opener takes their hearer group's reading of the platform, rapport and answer for the evening, with no retelling or contact tie; test `src/core2/campaign-door-groups.test.ts` passes and fails when the shared evening visit is removed. It does not pay. Same-commit year-4 profiles of Gunnison UT (4932660, n8f6) put `walkWith` at 5.8 s on main b1f30ebd against 5.2 s on the branch, because most people who open a world campaign's door are counted residents, which already take the counted path; the rest of the door cost is their `doorAppealOf` (2.7 s). Timed pairs were 159.3 against 143.3 s and, reversed, 134.6 against 141.7 s: inside the noise. Town race winners held in all 30 (Gunnison, both pairs), 49 of 49 (Smackover AR, n8b2) and 37 of 38 (Dickey ND, n8g7: a 2028 county commissioner seat with no filer on main got an unopposed one). No PR opened. Main's year 4 now profiles at about 117 s of simulation: campaigns 25 s (day choices 7.0, volunteer shifts 5.2, polls, endorsements), voting 14, garbage collection 13, coverage 8.5, the cash journal 7.9, life 7.4, press 7.2. The remaining campaign lever is counted residents' door answers and poll answers by counted group, a different design from this item's.
