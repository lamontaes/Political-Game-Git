---
id: core-speed-world-campaign-days-as-group-results
title: "A world candidate's doors, polls and asks reach unwatched full people as group results (design stage 3), the next 15 to 20 s of an election year"
area: core
kind: feature
priority: 1
size: L
status: claimed
claimed-by: speed/campaign-day-groups
pr:
blocked-on:
after: core-speed-message-viewers-as-groups
source: added with npm run pool -- add
claimed-at: 2026-11-09T21:44:15.720Z
---

**What.** After speeches and paid messages became group results (core-speed-hearers-as-groups, core-speed-message-viewers-as-groups), Gunnison UT's election year (key 4932660, seed n8f6) still spends 35 s in world campaigns, spread thin: campaign day choices 8.9 s (doors, donation asks, events), volunteer door shifts 6.5 s (walkWith 7.2 s: doorChoiceOf 3.2, walkDoors 2.3), polls 5.1 s, group endorsements 4.0 s. Each is a per-person decision by people nobody watches (a door answer, a poll answer, a donation answer). Make a world campaign's doors, polls and asks to unwatched full people a result by hearer group: a group impression row per group and candidate (mean warmth, share who heard of them, share who know the platform), impressionOf reads the group for a member with no row of their own, and voting reads it by the same rule as a counted voter. Design: docs/speed/off-screen-campaigns-as-results.md, stage 3.

**Rules.** Level of detail (owner, Nov 9): the player's circle and focus and officials stay individual (hearsAsPerson); the player's own campaign is untouched. One model, two tiers: a group is read by the rule a person is, times its count. No dice. Behavior changes on purpose, so the proof is outcomes.

**Done when.** Gunnison, Utah (key 4932660, seed n8f6) and two other drawn places, four years, the branch against its base in alternating pairs of both orders, year 4 faster in both; town race winners, shares, turnout and stance spreads compared; a test that a group impression times its members equals the sum of the members' warmth reads within rounding.

**Files.** src/core2/modules/campaigns.ts, src/core2/modules/voting.ts, src/core2/hearer-groups.ts

**Notes.** TODO
