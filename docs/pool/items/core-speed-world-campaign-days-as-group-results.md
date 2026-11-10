---
id: core-speed-world-campaign-days-as-group-results
title: "A world candidate's doors, polls and asks reach unwatched full people as group results (design stage 3), the next 15 to 20 s of an election year"
area: core
kind: feature
priority: 1
size: L
status: open
standard: 2
claimed-by:
pr:
blocked-on: core-speed-world-campaign-days-as-group-results-part-1-poll-answers-by-group, core-speed-world-campaign-days-as-group-results-part-2-door-answers-counted-group, core-speed-world-campaign-days-as-group-results-part-3-asks-endorsements-by-group, core-speed-world-campaign-days-as-group-results-part-4-proof-across-places
after: core-speed-message-viewers-as-groups
model: opus
effort: high
root: design-country-tier
lead: speed
source: added with npm run pool -- add
claimed-at:
---

**What.** After speeches and paid messages became group results (core-speed-hearers-as-groups, core-speed-message-viewers-as-groups), Gunnison, Utah's election year (key 4932660, seed n8f6) still spends 35 s in world campaigns, spread thin: campaign day choices, volunteer door shifts, polls and group endorsements. Each is a per-person decision by people nobody watches. Make a world campaign's polls, donation asks, endorsements and counted residents' door answers a result by hearer group: a group impression row per group and candidate (mean warmth, share who heard of them, share who know the platform), `impressionOf` reading the group for a member with no row of their own, and voting reading it by the same rule as a counted voter. The doors part for unwatched full people was built and does not pay (walkWith 5.8 s on main against 5.2 s on the branch, because most door openers are counted residents who already take the counted path), so the item is re-cut around counted residents. It is built in four parts.

**Cause.** Design: docs/speed/off-screen-campaigns-as-results.md, stage 3. Measured (Speed, Nov 9): Gunnison, Utah (4932660, seed n8f6) year 4 profile, main b1f30ebd: world campaigns 25 s (day choices 7.0, volunteer shifts 5.2, polls, endorsements), `walkWith` 5.8 s vs 5.2 s with the doors branch (speed/campaign-day-groups, never merged) because most door openers are counted residents who already take the counted path.

**Fix.** Make a world campaign's polls, donation asks, endorsements and counted residents' door answers a result by hearer group (a group impression row per group and candidate that `impressionOf` and voting read by the same rule as a person, times the count); keep the player's circle, focus and officials individual (`hearsAsPerson`, src/core2/hearer-groups.ts). Built in the four parts named in blocked-on.

**Time box.** 16 hours across the four parts for one Opus session; each part has its own box. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Level of detail (owner, Nov 9): the player's circle and focus and officials stay individual; the player's own campaign is untouched. One model, two tiers: a group is read by the rule a person is, times its count. No dice. Behavior changes on purpose, so the proof is outcomes: town race winners, shares, turnout and stance spreads compared.

**Done when.** A second session, not the builder, plays Gunnison, Utah (key 4932660, seed n8f6) and two other drawn places for four years, the branch against its base in alternating pairs of both orders: year 4 is faster in both orders, and town race winners, shares, turnout and stance spreads are compared and reported. A test shows a group impression times its members equals the sum of the members' warmth reads within rounding. All four parts are done.

**Waits on.** core-speed-message-viewers-as-groups (the after: line) and the four parts (core-speed-world-campaign-days-as-group-results-part-1-poll-answers-by-group to -part-4-proof-across-places).

**Files.** src/core2/modules/campaigns.ts, src/core2/modules/voting.ts, src/core2/hearer-groups.ts, src/core2/campaign-day.ts

**Notes.** TODO Nov 9, 22:50 UTC (Speed): built the doors part on `speed/campaign-day-groups` (9ce10f23). At a world campaign's doors, an unwatched full opener takes their hearer group's reading of the platform, rapport and answer for the evening, with no retelling or contact tie; test `src/core2/campaign-door-groups.test.ts` passes and fails when the shared evening visit is removed. It does not pay. Same-commit year-4 profiles of Gunnison UT (4932660, n8f6) put `walkWith` at 5.8 s on main b1f30ebd against 5.2 s on the branch, because most people who open a world campaign's door are counted residents, which already take the counted path; the rest of the door cost is their `doorAppealOf` (2.7 s). Timed pairs were 159.3 against 143.3 s and, reversed, 134.6 against 141.7 s: inside the noise. Town race winners held in all 30 (Gunnison, both pairs), 49 of 49 (Smackover AR, n8b2) and 37 of 38 (Dickey ND, n8g7: a 2028 county commissioner seat with no filer on main got an unopposed one). No PR opened. Main's year 4 now profiles at about 117 s of simulation: campaigns 25 s (day choices 7.0, volunteer shifts 5.2, polls, endorsements), voting 14, garbage collection 13, coverage 8.5, the cash journal 7.9, life 7.4, press 7.2. The remaining campaign lever is counted residents' door answers and poll answers by counted group, a different design from this item's.
