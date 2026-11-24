---
id: campaign-big-group-endorsement-sends-no-volunteers
title: "A big interest group or party chapter that endorses a candidate sends them no volunteers"
area: elections
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
lead: governing
source: account lead sweep, Nov 14 (Measured: Bennington KS after fold #9244)
standard: 2
model: opus
effort: medium
root: none
checked:
---

**What.** A player endorsed only by a large interest group and a party chapter gets no one walking doors from them: every member asked says no. A cause group of one to seven people does send volunteers, so a candidate backed by a big group has the group's name and none of its hands. Seen: the Campaign tab's volunteers list and the volunteer-door outings of a candidate a big group backs.

**Cause.** Measured: Bennington, Kansas (2006075, place seed `d3e80a0a852ebb1850f1420f52bfa167ccf63d7cd1446c0457af35a5162a3507`), the player's real race to 2025-11-03 on the train at ce166298b7 with the filing platform the played test files by itself. On 2025-05-05 the interest group "allow multifamily in single-family zones: against" (55 members) and the Republican party chapter of Kansas (153 members) both endorsed the player ("agrees") and `volunteerIds` on each endorsement row is empty: 0 of 208 members said yes. Before fold #9244 the town's natural-resources cause groups (one to two members each) endorsed the player and one member of one volunteered and walked doors. Found in code: the endorsement loop (`src/core2/modules/campaigns.ts`, the `volunteerIds` loop after `weighEndorsement`) asks every member in turn through `askToVolunteer`, whose `volunteerReason` is warmth to the candidate, plus `volunteerClosenessWeight` times (closeness to the candidate, family, closeness to the group's speaker), plus `groupVolunteerStakeWeight` times the member's agreement with the group's stance, less the member's weekly work hours over `turnoutWorkWeekMinutes` and `volunteerThreshold`. For members of a big group the closeness to the speaker is near zero and warmth to a candidate they have not met is near zero, so only the stake term is left, and the hours and the threshold outweigh it for nearly everyone.

**Fix.** Read first whether the yes should come from the member's share in the group's cause alone once a group has named a candidate (a member who holds the stand at full strength and is free that week), before changing any weight; the weights are sourced numbers in `src/core2/data/campaigns/parameters.json` and a refit needs the volunteer calibration run. Do not add a cap or a floor.

**Time box.** 3 hours, Opus at medium effort.

**Rules.** No dice: a member's yes comes from their warmth, closeness, stake and hours. One rule for full and counted members.

**Done when.** A second session replays Bennington, Kansas at the place seed above in a played world built with buildBenchWorld, files for the council race on the platform the played test files, and sees the interest group's endorsement row carry a non-empty `volunteerIds` with the member's volunteer-door cause by record id, and a one-year run at three other places shows no change in the doors walked by candidates no group backs.

**Waits on.** Nothing.

**Files.** src/core2/modules/campaigns.ts, src/core2/data/campaigns/parameters.json, src/core2/campaign-real-race-played.test.ts

**Notes.** Nov 14 (account lead): found while re-pinning the real race at Bennington after fold #9244; the carry for the test itself stages the player taking a cause group's stand, so this item is not blocking it. Related: campaign-door-warmth-follows-the-canvasser-not-the-platform changes door warmth, which `volunteerReason` reads as warmth.
